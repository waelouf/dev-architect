const { WebClient } = require('@slack/web-api');

class SlackClient {
  constructor(botToken) {
    this.client = new WebClient(botToken);
  }

  /**
   * Post a message to a channel
   * Returns the message timestamp (thread ID)
   */
  async postMessage(channelId, message) {
    try {
      const result = await this.client.chat.postMessage({
        channel: channelId,
        ...message
      });

      return result.ts;
    } catch (error) {
      console.error('[slack-notify] Error posting message:', error.message);
      throw error;
    }
  }

  /**
   * Get replies to a message thread
   */
  async getThreadReplies(channelId, threadTs) {
    try {
      const result = await this.client.conversations.replies({
        channel: channelId,
        ts: threadTs,
        limit: 100
      });

      // Filter out the original message
      return result.messages.filter(msg => msg.ts !== threadTs);
    } catch (error) {
      console.error('[slack-notify] Error getting thread replies:', error.message);
      throw error;
    }
  }

  /**
   * Poll for a response to a question
   * Returns the response text or null if timeout
   */
  async pollForResponse(channelId, messageTs, questionId, pollIntervalSeconds, timeoutMinutes) {
    const startTime = Date.now();
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const pollIntervalMs = pollIntervalSeconds * 1000;

    let attemptCount = 0;

    while (Date.now() - startTime < timeoutMs) {
      attemptCount++;
      console.log(`[slack-notify] Polling for response... (attempt ${attemptCount})`);

      try {
        // Check for thread replies
        const replies = await this.getThreadReplies(channelId, messageTs);

        if (replies.length > 0) {
          // Get the first reply text
          const responseText = replies[0].text;
          console.log(`[slack-notify] Received thread reply: "${responseText}"`);
          return {
            type: 'text',
            value: responseText
          };
        }

        // Check for button interactions via reactions or message edits
        // Note: For a production implementation, you'd use Socket Mode or
        // webhook endpoints to receive button clicks immediately.
        // For this polling approach, we'll check if the original message
        // has been updated with a reaction that indicates a button was clicked.

        // For simplicity, we rely on thread replies as the primary response mechanism
        // Users can click "Other" or just reply in the thread

      } catch (error) {
        console.error('[slack-notify] Error during polling:', error.message);
        // Continue polling even if there's an error
      }

      // Wait before next poll
      await sleep(pollIntervalMs);
    }

    console.log('[slack-notify] Polling timeout reached');
    return null;
  }

  /**
   * Test the connection by posting a simple message
   */
  async testConnection(channelId) {
    try {
      const result = await this.client.chat.postMessage({
        channel: channelId,
        text: ':white_check_mark: Slack Notify plugin connection successful!'
      });

      return {
        success: true,
        ts: result.ts
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List channels available to the bot
   */
  async listChannels() {
    try {
      const result = await this.client.conversations.list({
        types: 'public_channel,private_channel',
        limit: 100
      });

      return result.channels.map(channel => ({
        id: channel.id,
        name: channel.name,
        isPrivate: channel.is_private
      }));
    } catch (error) {
      console.error('[slack-notify] Error listing channels:', error.message);
      throw error;
    }
  }

  /**
   * Verify the bot token is valid
   */
  async verifyToken() {
    try {
      const result = await this.client.auth.test();
      return {
        valid: true,
        botId: result.bot_id,
        userId: result.user_id,
        teamId: result.team_id
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }
}

/**
 * Sleep helper function
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = SlackClient;
