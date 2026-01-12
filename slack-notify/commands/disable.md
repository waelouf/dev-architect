---
name: slack-notify:disable
description: Temporarily disable or re-enable Slack notifications
---

# Disable/Enable Slack Notifications

You are helping the user toggle Slack notifications on or off.

## Your Task

### Step 1: Check Current Status

First, determine the current configuration status:

1. Use the Read tool to check if `~/.claude/slack-notify.json` exists
2. If it exists, check the `enabled` field
3. Determine current state: enabled, disabled, or not configured

### Step 2: Ask User Intent

If the config exists, ask the user what they want to do:

**Current Status Display:**
- If enabled: "Slack notifications are currently **enabled**"
- If disabled: "Slack notifications are currently **disabled**"
- If not configured: "Slack notifications are **not configured yet**"

**Action Question:**

Use AskUserQuestion to ask what they want to do:

```javascript
{
  questions: [
    {
      question: "What would you like to do with Slack notifications?",
      header: "Action",
      options: [
        {
          label: "Disable",
          description: "Turn off Slack notifications, questions will appear locally"
        },
        {
          label: "Enable",
          description: "Turn on Slack notifications for remote sessions"
        },
        {
          label: "Cancel",
          description: "Keep current settings"
        }
      ],
      multiSelect: false
    }
  ]
}
```

### Step 3: Update Configuration

Based on their choice:

**If Disable:**
1. Use the Read tool to load the current config
2. Use the Edit tool to set `"enabled": false`
3. Confirm: "✅ Slack notifications disabled. Questions will now appear in your local terminal."
4. Remind: "You can re-enable anytime with `/slack-notify:disable` (same command)"

**If Enable:**
1. Use the Read tool to load the current config
2. Use the Edit tool to set `"enabled": true`
3. Confirm: "✅ Slack notifications enabled. Questions will be sent to Slack when you're working remotely."
4. Suggest: "Test it with `/slack-notify:test`"

**If Cancel:**
- Simply acknowledge: "No changes made. Current settings preserved."

### Step 4: If Not Configured

If the config file doesn't exist:
- Inform: "Slack notifications haven't been set up yet."
- Suggest: "Run `/slack-notify:setup` to configure Slack integration."
- Explain: "Once configured, you can use this command to toggle notifications on/off."

## Important Notes

- This command only toggles the `enabled` flag in the config
- It doesn't delete the config or require re-entering credentials
- Users can toggle as often as they want without reconfiguring
- When disabled, the hook falls back to normal local behavior

## Use Cases

**When to disable:**
- Working on local machine (don't need Slack notifications)
- Debugging locally and want immediate prompts
- Temporary preference to handle questions in terminal

**When to enable:**
- Working on remote servers via SSH
- Running long autonomous tasks
- Want async notifications while doing other work
