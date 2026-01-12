# Slack Notify Plugin - Design Document

**Date:** 2026-01-11
**Status:** Design Complete
**Author:** waelouf

## Overview

A Claude Code plugin that sends notifications to Slack when Claude needs user input during remote sessions. Enables asynchronous interaction via Slack channel with support for both interactive buttons and text responses.

## Use Case

**Primary Scenario:** Long-running autonomous tasks on remote servers

Claude is running autonomously on a remote machine (CI/CD, cloud instance, development server) and needs decisions when blocked. Instead of the session stalling, Claude posts questions to a configured Slack channel where the user can respond from anywhere (phone, laptop, etc.).

## Architecture

### High-Level Design

**Option Selected:** Pure Hook with Polling

The solution uses a `PreToolUse` hook that intercepts `AskUserQuestion` calls and redirects them to Slack:

1. Hook detects when Claude wants to ask a question
2. Posts question to configured Slack channel with interactive buttons/menus
3. Polls Slack API periodically for user response
4. Returns response to Claude when received
5. Falls back to normal behavior if Slack is disabled or fails

### Components

**1. PreToolUse Hook (`ask-via-slack.js`)**
- Intercepts `AskUserQuestion` tool calls
- Posts questions to Slack with interactive elements
- Polls for responses using Slack API
- Returns responses to Claude

**2. Configuration File (`~/.claude/slack-notify.json`)**
```json
{
  "enabled": true,
  "botToken": "xoxb-your-bot-token",
  "channelId": "C01234567",
  "pollIntervalSeconds": 45,
  "timeoutMinutes": 30,
  "logLevel": "info",
  "sanitizeMessages": false
}
```

**3. Support Libraries**
- `slack-client.js` - Slack API wrapper
- `config-manager.js` - Configuration management
- `message-builder.js` - Block Kit message formatting

## Slack Integration

### Message Format

Questions are posted with two interaction modes:

**Multiple Choice Questions:**
```
Claude needs your input:

Which authentication method should we use?

[OAuth 2.0] [JWT] [Session-based] [Other...]
```

**Open-Ended Questions:**
```
Claude needs your input:

What should the API endpoint path be?

💬 Reply in thread with your answer
```

### Response Flow

**Selected:** Both buttons for simple choices and thread replies for complex input

- Interactive buttons/menus for predefined options
- "Other" button or direct thread replies for custom input
- Responses are parsed and passed back to Claude's `AskUserQuestion`

### Polling Mechanism

After posting a question:
1. Sleep for `pollIntervalSeconds` (default 45s)
2. Call Slack API to check for button clicks or thread replies
3. If response found: parse and return to Claude
4. If timeout reached (default 30 min): return error/cancel signal
5. Otherwise repeat

Uses Slack's `conversations.replies` API for thread responses and interaction payloads for button clicks.

## Technical Implementation

### Technology Stack

- **Language:** Node.js (v16+)
- **Primary Dependency:** `@slack/web-api` SDK
- **Reason:** Excellent Slack SDK, async/await for clean polling, easy hook integration

### Hook Structure

```javascript
// ~/.claude/hooks/PreToolUse/ask-via-slack.js

const { WebClient } = require('@slack/web-api');
const fs = require('fs');
const path = require('path');

async function shouldUseSlack() {
  // Read config, check enabled flag
}

async function postQuestionToSlack(question, options) {
  // Build message with interactive elements
  // Post to channel, return message timestamp
}

async function pollForResponse(messageTs, timeoutMinutes) {
  // Poll thread replies and interactions
  // Return response or timeout
}

async function main(toolName, params) {
  if (toolName !== 'AskUserQuestion') return { allow: true };

  if (!await shouldUseSlack()) return { allow: true };

  // Post question to Slack
  const messageTs = await postQuestionToSlack(...);

  // Poll for response
  const response = await pollForResponse(messageTs, ...);

  // Return modified params with answers
  return {
    allow: true,
    modified_params: { ...params, answers: response }
  };
}
```

### Activation Logic

The hook activates when:
- Config file exists at `~/.claude/slack-notify.json`
- `enabled: true` in config
- Valid `botToken` and `channelId` are present
- Falls back to normal behavior if any check fails

## Error Handling

### Network Failures

If Slack API calls fail:
- Log error to `~/.claude/logs/slack-notify.log`
- Fall back to normal `AskUserQuestion` behavior
- Show warning: "Slack notification failed, continuing locally"

### Timeout Behavior

When polling times out (no response after 30 minutes):
- Return `allow: false` with error message
- Claude receives cancellation signal
- Alternative: return `{"timeout": true}` for skill detection

### Multiple Questions

If Claude asks multiple questions rapidly:
- Each gets its own Slack thread
- Include counter: "Question 1 of 3"
- Each poll is independent (can answer in parallel)

### Stale Responses

To prevent old messages from interfering:
- Each question gets unique ID (timestamp + random string)
- Stored in Block Kit metadata
- Hook only accepts matching question IDs

### Partial Configuration

- Missing `botToken` → disable Slack, log warning
- Missing `channelId` → disable Slack, log warning
- Missing optional fields → use defaults

## Configuration & Setup

### Initial Setup

**Step 1: Create Slack App**
- Go to api.slack.com/apps → "Create New App"
- Enable Socket Mode, generate app-level token
- Add Bot Token Scopes: `chat:write`, `channels:history`, `channels:read`
- Install app to workspace, copy Bot User OAuth Token

**Step 2: Initialize Config**
```bash
claude-code plugin run slack-notify setup
```

Interactive wizard:
- Prompts for bot token (validates it works)
- Lists channels, lets you select one
- Asks for poll interval and timeout
- Writes config to `~/.claude/slack-notify.json`
- Tests by sending "Setup complete!" message

**Step 3: Enable Hook**
Hook auto-enables when plugin installed. Toggle with:
```bash
# Disable temporarily
claude-code config set slack-notify.enabled false

# Re-enable
claude-code config set slack-notify.enabled true
```

### Multi-Environment Support

Run setup wizard on each machine with different channels:
- Dev server → `#claude-dev`
- Prod server → `#claude-prod`
- Local machine → disabled

## Plugin Structure

```
slack-notify/
├── .claude-plugin/
│   └── plugin.json              # Plugin metadata
├── hooks/
│   └── PreToolUse/
│       ├── ask-via-slack.js     # Main hook logic
│       └── package.json         # Node.js dependencies
├── commands/
│   ├── setup.md                 # /slack-notify:setup command
│   ├── test.md                  # /slack-notify:test command
│   └── disable.md               # /slack-notify:disable command
├── lib/
│   ├── slack-client.js          # Slack API wrapper
│   ├── config-manager.js        # Config read/write
│   └── message-builder.js       # Block Kit message formatting
├── README.md                    # Documentation
└── package.json                 # Plugin metadata
```

### Key Files

1. **ask-via-slack.js** - Main hook (150-200 lines)
2. **slack-client.js** - Wraps `@slack/web-api`
3. **config-manager.js** - Reads/writes config, validates
4. **message-builder.js** - Converts params to Block Kit JSON

### Slash Commands

- `/slack-notify:setup` - Interactive setup wizard
- `/slack-notify:test` - Send test question to verify
- `/slack-notify:disable` - Temporarily disable notifications

## Testing

### Manual Testing

1. **Setup Test:**
   ```bash
   /slack-notify:setup
   # Verify "Setup complete!" appears in Slack
   ```

2. **Simple Question Test:**
   ```bash
   /slack-notify:test
   # Click button in Slack, verify Claude receives answer
   ```

3. **Real-World Test:**
   ```bash
   # On remote server
   claude-code chat
   > Help me refactor this module
   # When Claude asks → appears in Slack
   # Answer → Claude continues
   ```

### Edge Case Checklist

- [ ] Invalid Slack token → falls back gracefully
- [ ] Unreachable Slack API → falls back gracefully
- [ ] Timeout (30 min wait) → returns error
- [ ] Multiple questions in parallel → each gets own thread
- [ ] Clicking "Other" → prompts for thread reply
- [ ] Network hiccup during polling → retries work
- [ ] Config file missing → disables Slack mode
- [ ] Config file malformed → logs error, disables

## Deployment

### Remote Server Requirements

- Node.js v16+ installed
- Claude Code installed with this plugin
- Network access to api.slack.com

### Setup on Remote Machine

```bash
ssh user@remote-server

# Install plugin
git clone https://github.com/your-username/slack-notify.git
cd slack-notify && npm install
claude-code plugin link .

# Run setup
claude-code plugin run slack-notify setup

# Test
/slack-notify:test
```

### Typical Usage

```bash
# Start long-running task on remote server
ssh user@remote-server
claude-code chat

> Please refactor the authentication module and run all tests
> Fix any issues you find

# Claude works autonomously
# When needs decisions → Slack notification
# Answer from anywhere → Claude continues
```

### Monitoring

Logs written to `~/.claude/logs/slack-notify.log`:
```
2026-01-11 14:32:15 [INFO] Posted question to Slack (msg_id: 1736606735.123456)
2026-01-11 14:32:45 [INFO] Polling for response... (attempt 1/40)
2026-01-11 14:33:30 [INFO] Received button click: "OAuth 2.0"
2026-01-11 14:33:30 [INFO] Returning response to Claude
```

## Security & Privacy

### Token Security

- Store in `~/.claude/slack-notify.json` with `chmod 600`
- Never log full token (only last 4 chars)
- Setup wizard warns about keeping token secret

### Message Content

Questions may contain sensitive information:
- Project names, file paths, code snippets
- Architecture decisions, error messages

**Mitigation:**
- Use private channel (not public)
- Consider dedicated workspace for sensitive projects
- Optional `sanitizeMessages: true` redacts paths/secrets
- Replaces sensitive data with `[PATH]`, `[REDACTED]`

### Rate Limiting

- Default 45s poll interval well within Slack limits (~1 req/sec)
- Max 40 polls = 30 min timeout fits hourly limits
- Hook tracks API calls, backs off on 429 responses

### Access Control

- Only people in configured channel see questions
- Recommended: Private channel for you + Claude
- For teams: Invite only authorized developers

### Audit Trail

- All Slack messages logged by Slack
- Review what Claude asked and how you responded
- Useful for debugging decisions

## Future Enhancements

### Potential Additions

1. **Conversation Mode:** `/slack-notify:discuss` for back-and-forth chat before resuming

2. **Smart Polling:** Start 30s intervals, back off to 60s after 5 attempts

3. **Mobile Push:** Integrate Slack mobile notifications for urgent questions

4. **Multi-User:** Support @mentions - first responder unblocks Claude

5. **Response Templates:** Pre-configure common answers as quick-reply buttons

6. **Socket Mode Upgrade:** Optional sidecar mode for real-time responses (power users)

### Known Limitations

1. **Polling Latency:** ~22s average wait before Claude sees response (vs real-time Socket Mode)

2. **Resource Usage:** Claude process stays running while polling (~100-200MB memory)

3. **Single Response Model:** Once answered, Claude continues - no easy mid-execution pause

4. **No Rich Media:** Text/buttons only - can't upload files/images as answers

## Comparison to Alternatives

**vs. call-me Plugin (phone calls):**
- **Advantages:** Asynchronous, logged history, team collaboration, rich formatting, free
- **Disadvantages:** Requires internet + Slack setup, not as attention-grabbing
- **Sweet Spot:** Less urgent than calls, more structured than email/SMS

**vs. Socket Mode Sidecar:**
- **Advantages:** Simpler (no process management), easier to debug, single process
- **Disadvantages:** Higher resource usage, polling latency, less efficient
- **Choice Rationale:** Simplicity wins for v1, can upgrade to sidecar later

## Implementation Checklist

- [ ] Create plugin structure with directories
- [ ] Write `plugin.json` metadata
- [ ] Implement `lib/config-manager.js`
- [ ] Implement `lib/slack-client.js`
- [ ] Implement `lib/message-builder.js`
- [ ] Implement `hooks/PreToolUse/ask-via-slack.js`
- [ ] Create `/slack-notify:setup` command
- [ ] Create `/slack-notify:test` command
- [ ] Create `/slack-notify:disable` command
- [ ] Write README with setup instructions
- [ ] Add Jest unit tests
- [ ] Manual testing on remote server
- [ ] Create example screenshots for docs
- [ ] Publish to marketplace

## Success Criteria

Plugin is successful if:
1. Setup wizard completes in < 5 minutes
2. Test question appears in Slack within 5 seconds
3. Response from Slack reaches Claude within 60 seconds
4. Falls back gracefully on network failures
5. Works on remote servers without public endpoints
6. Zero config changes needed after initial setup
