#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

// Import lib modules from parent directory
const SlackClient = require('../../lib/slack-client');
const configManager = require('../../lib/config-manager');
const messageBuilder = require('../../lib/message-builder');

/**
 * Main hook function
 * Intercepts AskUserQuestion and redirects to Slack if configured
 */
async function main(toolName, params) {
  // Only intercept AskUserQuestion calls
  if (toolName !== 'AskUserQuestion') {
    return { allow: true };
  }

  // Check if Slack should be used
  if (!configManager.shouldUseSlack()) {
    // Fall back to normal behavior
    return { allow: true };
  }

  try {
    const config = configManager.readConfig();

    // Initialize Slack client
    const slackClient = new SlackClient(config.botToken);

    // Process each question
    const questions = params.questions || [];
    const answers = {};

    for (let i = 0; i < questions.length; i++) {
      const questionData = questions[i];
      const questionNumber = questions.length > 1 ? ` (${i + 1}/${questions.length})` : '';

      // Add question counter to the question text
      const enhancedQuestion = {
        ...questionData,
        question: `${questionData.question}${questionNumber}`
      };

      // Sanitize if configured
      if (config.sanitizeMessages) {
        enhancedQuestion.question = configManager.sanitizeMessage(
          enhancedQuestion.question,
          true
        );
      }

      // Generate unique question ID
      const questionId = messageBuilder.generateQuestionId();

      // Build Slack message
      const message = messageBuilder.buildQuestionMessage(enhancedQuestion, questionId);

      console.log(`[slack-notify] Posting question to Slack: "${questionData.question}"`);

      // Post to Slack
      const messageTs = await slackClient.postMessage(config.channelId, message);

      console.log(`[slack-notify] Question posted (msg_id: ${messageTs})`);

      // Poll for response
      const response = await slackClient.pollForResponse(
        config.channelId,
        messageTs,
        questionId,
        config.pollIntervalSeconds,
        config.timeoutMinutes
      );

      if (!response) {
        console.error('[slack-notify] Timeout waiting for response');

        // Post timeout message to Slack
        const timeoutMsg = messageBuilder.buildErrorMessage(
          `Timeout: No response received after ${config.timeoutMinutes} minutes. Claude will continue without this answer.`
        );
        await slackClient.postMessage(config.channelId, timeoutMsg);

        // Return error to Claude
        return {
          allow: false,
          error: 'Slack response timeout'
        };
      }

      console.log(`[slack-notify] Received response: "${response.value}"`);

      // Store the answer using the question text as key
      // (This matches how AskUserQuestion expects answers)
      answers[questionData.question] = response.value;
    }

    // Return modified params with answers from Slack
    return {
      allow: true,
      modified_params: {
        ...params,
        answers
      }
    };

  } catch (error) {
    console.error('[slack-notify] Error in hook:', error.message);
    console.error('[slack-notify] Falling back to local question prompt');

    // Log to file if possible
    logError(error);

    // Fall back to normal behavior on error
    return { allow: true };
  }
}

/**
 * Log errors to file
 */
function logError(error) {
  try {
    const os = require('os');
    const logDir = path.join(os.homedir(), '.claude', 'logs');
    const logFile = path.join(logDir, 'slack-notify.log');

    // Ensure log directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} [ERROR] ${error.message}\n${error.stack}\n\n`;

    fs.appendFileSync(logFile, logEntry, 'utf8');
  } catch (logError) {
    // Silently fail if we can't log
    console.error('[slack-notify] Could not write to log file:', logError.message);
  }
}

// Export for Claude Code hooks
module.exports = main;

// If run directly (for testing), execute with sample params
if (require.main === module) {
  const testParams = {
    questions: [
      {
        question: 'Which authentication method should we use?',
        header: 'Auth Method',
        options: [
          { label: 'OAuth 2.0', description: 'Industry standard, secure' },
          { label: 'JWT', description: 'Stateless, scalable' },
          { label: 'Session-based', description: 'Simple, traditional' }
        ],
        multiSelect: false
      }
    ]
  };

  main('AskUserQuestion', testParams)
    .then(result => {
      console.log('Hook result:', JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('Hook error:', error);
      process.exit(1);
    });
}
