---
name: slack-notify:test
description: Test Slack notification setup with a sample question
---

# Test Slack Notifications

You are testing the Slack Notify plugin configuration by sending a sample question to Slack.

## Your Task

### Step 1: Verify Configuration

First, check if the plugin is configured:

1. Use the Read tool to check if `~/.claude/slack-notify.json` exists
2. Verify it contains `botToken` and `channelId`
3. Check that `enabled` is `true`

If not configured, inform the user:
- "Slack notifications are not configured yet"
- "Please run `/slack-notify:setup` first"
- Stop here

### Step 2: Send Test Question

If configured, use the AskUserQuestion tool to send a test question:

```javascript
{
  questions: [
    {
      question: "Which color do you prefer? (This is a test question from Claude Code Slack Notify plugin)",
      header: "Test",
      options: [
        { label: "Blue", description: "Calm and professional" },
        { label: "Red", description: "Bold and energetic" },
        { label: "Green", description: "Natural and fresh" }
      ],
      multiSelect: false
    }
  ]
}
```

### Step 3: Monitor the Test

While the question is being sent to Slack:

1. Inform the user: "Test question sent to Slack! Please check your configured channel."
2. Explain what should happen:
   - They should see a message from the Claude bot
   - The message will have three buttons (Blue, Red, Green, Other)
   - They can click any button or reply in the thread
3. Wait for their response from Slack

### Step 4: Verify Response

Once you receive the response:

1. Display which option they selected
2. Confirm: "✅ Slack notifications are working correctly!"
3. Show the round-trip time if possible
4. Remind them:
   - The hook will now activate automatically when you ask questions
   - They can disable it temporarily with `/slack-notify:disable`
   - Logs are in `~/.claude/logs/slack-notify.log`

### If Test Fails

If the test question times out or fails:

1. Check the log file at `~/.claude/logs/slack-notify.log`
2. Display relevant error messages
3. Suggest troubleshooting steps:
   - Verify bot token is still valid
   - Check that the bot is in the selected channel
   - Ensure network connectivity to api.slack.com
   - Try running `/slack-notify:setup` again

## Expected Behavior

- Question appears in Slack within 5 seconds
- User clicks button or replies in thread
- Response reaches Claude within poll interval (typically 45 seconds)
- Success message displayed to user

## Debugging Tips

If issues occur:
- Read the log file to see detailed error messages
- Verify the bot has correct permissions
- Test the bot token with Slack's API tester
- Ensure the channel ID is correct
