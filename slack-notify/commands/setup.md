---
name: slack-notify:setup
description: Configure Slack notifications for Claude questions
---

# Slack Notify Setup

You are helping the user set up Slack notifications for Claude Code. This interactive wizard will configure the plugin to send questions to Slack during remote sessions.

## Your Task

Guide the user through the following steps:

### Step 1: Verify Slack App Creation

First, check if the user has already created a Slack app. Ask:

**"Have you already created a Slack app with bot permissions?"**

Options:
- "Yes, I have a bot token ready"
- "No, I need to create one now"

If they need to create one:
1. Direct them to https://api.slack.com/apps
2. Explain: "Create a new app, add these bot token scopes: `chat:write`, `channels:history`, `channels:read`"
3. Guide them to install the app to their workspace and copy the Bot User OAuth Token (starts with `xoxb-`)
4. Wait for them to confirm they have the token

### Step 2: Get Bot Token

Use the AskUserQuestion tool to collect the bot token:
- Question: "Please paste your Slack Bot User OAuth Token"
- This should be an open-ended question (no predefined options)
- Store the response

Then validate the token by:
1. Use the Read tool to load `../lib/slack-client.js`
2. Use the Bash tool to run a Node.js script that validates the token:
```javascript
const SlackClient = require('./lib/slack-client');
const client = new SlackClient('USER_PROVIDED_TOKEN');
const result = await client.verifyToken();
console.log(JSON.stringify(result));
```

If invalid, inform the user and ask for the token again.

### Step 3: Select Channel

Once the token is verified:
1. Use the Bash tool to run a script that lists available channels
2. Present the channels to the user with AskUserQuestion
3. Let them select which channel to use for notifications
4. Recommend creating a private channel like `#claude-notifications`

### Step 4: Configure Poll Settings

Ask the user about poll settings (with recommended defaults):

**"How often should Claude check for your responses?"**
- "Every 30 seconds (faster response)"
- "Every 45 seconds (recommended)"
- "Every 60 seconds (reduce API calls)"

**"How long should Claude wait before timing out?"**
- "15 minutes"
- "30 minutes (recommended)"
- "60 minutes"

### Step 5: Write Configuration

Use the Write tool to create the config file at `~/.claude/slack-notify.json`:

```json
{
  "enabled": true,
  "botToken": "USER_PROVIDED_TOKEN",
  "channelId": "SELECTED_CHANNEL_ID",
  "pollIntervalSeconds": SELECTED_INTERVAL,
  "timeoutMinutes": SELECTED_TIMEOUT,
  "logLevel": "info",
  "sanitizeMessages": false
}
```

### Step 6: Test Connection

Finally, test the setup by:
1. Loading the slack-client.js
2. Running a test that posts "Setup complete! 🎉" to the configured channel
3. Ask the user to confirm they see the message in Slack

If successful, congratulate them and explain:
- The hook is now active
- When Claude asks questions, they'll appear in Slack
- They can temporarily disable with `/slack-notify:disable`
- Logs are written to `~/.claude/logs/slack-notify.log`

## Important Notes

- NEVER log or display the full bot token in output
- Set file permissions to 600 (owner read/write only) on the config file
- If any step fails, provide clear error messages and guidance
- Recommend using a private channel for security

## Security Reminders

When writing the config, remind the user:
- Keep the bot token secret
- Use a private channel for sensitive projects
- Questions may contain file paths and code snippets
- Consider using `sanitizeMessages: true` for production servers
