const os = require('os');
const crypto = require('crypto');

/**
 * Generate a unique question ID
 */
function generateQuestionId() {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  return `${timestamp}-${random}`;
}

/**
 * Build Slack Block Kit message for a question with options
 */
function buildQuestionMessage(questionData, questionId) {
  const { question, options, header, multiSelect } = questionData;
  const hostname = os.hostname();
  const timestamp = new Date().toISOString();

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🤖 Claude needs your input',
        emoji: true
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${question}*`
      }
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `*Host:* ${hostname} | *Time:* ${timestamp}`
        }
      ]
    },
    {
      type: 'divider'
    }
  ];

  // Add buttons for each option
  if (options && options.length > 0) {
    const buttonElements = options.map((option, index) => ({
      type: 'button',
      text: {
        type: 'plain_text',
        text: option.label,
        emoji: true
      },
      value: JSON.stringify({
        questionId,
        label: option.label,
        index
      }),
      action_id: `answer_${index}`
    }));

    // Add "Other" button
    buttonElements.push({
      type: 'button',
      text: {
        type: 'plain_text',
        text: 'Other...',
        emoji: true
      },
      value: JSON.stringify({
        questionId,
        label: 'Other',
        index: -1
      }),
      action_id: 'answer_other',
      style: 'primary'
    });

    blocks.push({
      type: 'actions',
      elements: buttonElements
    });

    // Add option descriptions
    if (options.some(opt => opt.description)) {
      const descriptionText = options
        .map(opt => `*${opt.label}*: ${opt.description}`)
        .join('\n');

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: descriptionText
        }
      });
    }
  } else {
    // Open-ended question - prompt for thread reply
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '💬 *Reply in thread with your answer*'
      }
    });
  }

  return {
    blocks,
    text: `Claude question: ${question}`, // Fallback text for notifications
    metadata: {
      event_type: 'claude_question',
      event_payload: {
        questionId,
        hostname,
        timestamp
      }
    }
  };
}

/**
 * Build a simple text message
 */
function buildTextMessage(text) {
  return {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text
        }
      }
    ],
    text
  };
}

/**
 * Build a success message
 */
function buildSuccessMessage(text) {
  return {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:white_check_mark: ${text}`
        }
      }
    ],
    text
  };
}

/**
 * Build an error message
 */
function buildErrorMessage(text) {
  return {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:x: ${text}`
        }
      }
    ],
    text
  };
}

module.exports = {
  generateQuestionId,
  buildQuestionMessage,
  buildTextMessage,
  buildSuccessMessage,
  buildErrorMessage
};
