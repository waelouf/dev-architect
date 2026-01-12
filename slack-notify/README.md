# slack-notify

Send Claude Code questions to Slack during remote sessions for asynchronous interaction.

## Overview

The `slack-notify` plugin intercepts Claude's questions and sends them to a configured Slack channel, allowing you to respond from anywhere (phone, laptop, etc.) during long-running remote tasks. Perfect for autonomous Claude sessions on remote servers, CI/CD pipelines, or background tasks.

**Key Features:**
- Automatic redirection of `AskUserQuestion` to Slack
- Interactive buttons for multiple choice questions
- Thread replies for open-ended questions
- Configurable polling intervals and timeouts
- Graceful fallback to local prompts on errors
- Security features: token protection, message sanitization

## Installation

### From This Repository

```bash
cd slack-notify
npm install
claude-code plugin link .
```

### From GitHub (Future)

```bash
claude plugin marketplace add waelouf/slack-notify
claude plugin install slack-notify
```

## Quick Start

### 1. Create a Slack App

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name it "Claude Code" and select your workspace
4. Navigate to "OAuth & Permissions"
5. Add these Bot Token Scopes:
   - `chat:write`
   - `channels:history`
   - `channels:read`
6. Click "Install to Workspace"
7. Copy the "Bot User OAuth Token" (starts with `xoxb-`)

### 2. Configure the Plugin

Run the interactive setup wizard:

```bash
/slack-notify:setup
```

The wizard will:
- Validate your bot token
- List available channels
- Let you configure poll interval and timeout
- Test the connection
- Save configuration to `~/.claude/slack-notify.json`

### 3. Test It

Send a test question to Slack:

```bash
/slack-notify:test
```

You should see a question appear in your configured Slack channel within seconds. Click a button or reply in the thread, and Claude will receive your answer.

## Usage

Once configured, the plugin works automatically. When Claude asks a question during a session, it will:

1. Post the question to your Slack channel
2. Poll for your response (default: every 45 seconds)
3. Continue execution once you answer
4. Timeout after 30 minutes (configurable)

### Example Workflow

```bash
# SSH into remote server
ssh user@remote-server

# Start Claude Code
claude-code chat

# Give Claude a long-running task
> Please refactor the authentication module and run all tests.
> Fix any issues you find along the way.

# Claude starts working...
# When it needs a decision, you get a Slack notification
# Answer from anywhere (phone, laptop, etc.)
# Claude continues immediately with your choice
```

## Configuration

Configuration is stored at `~/.claude/slack-notify.json`:

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

### Configuration Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | boolean | true | Enable/disable Slack notifications |
| `botToken` | string | required | Slack Bot User OAuth Token |
| `channelId` | string | required | Slack channel ID to post questions |
| `pollIntervalSeconds` | number | 45 | How often to check for responses |
| `timeoutMinutes` | number | 30 | How long to wait before timing out |
| `logLevel` | string | "info" | Logging level (info, debug, error) |
| `sanitizeMessages` | boolean | false | Redact file paths and potential secrets |

## Commands

### `/slack-notify:setup`

Interactive wizard to configure the plugin. Guides you through:
- Slack app creation
- Bot token validation
- Channel selection
- Poll interval and timeout configuration
- Connection testing

### `/slack-notify:test`

Send a test question to Slack to verify everything works. Useful after setup or when troubleshooting.

### `/slack-notify:disable`

Toggle Slack notifications on/off. Useful when:
- Working locally and want immediate prompts
- Debugging and need terminal interaction
- Temporarily disabling without reconfiguring

Run the same command to re-enable.

## How It Works

### Architecture

The plugin uses a `PreToolUse` hook that intercepts `AskUserQuestion` calls:

1. **Detection:** Hook checks if Slack is configured and enabled
2. **Message Building:** Converts question to Slack Block Kit format with buttons
3. **Posting:** Sends message to configured channel via Slack API
4. **Polling:** Checks Slack API every N seconds for thread replies
5. **Response:** Returns answer to Claude once received
6. **Fallback:** On error, falls back to normal local prompt

### Message Format

**Multiple Choice Questions:**
```
🤖 Claude needs your input

Which authentication method should we use?

[OAuth 2.0] [JWT] [Session-based] [Other...]

OAuth 2.0: Industry standard, secure
JWT: Stateless, scalable
Session-based: Simple, traditional
```

**Open-Ended Questions:**
```
🤖 Claude needs your input

What should the API endpoint path be?

💬 Reply in thread with your answer
```

## Multi-Environment Setup

You can configure different channels per machine:

**Local Machine:**
```json
{
  "enabled": false
}
```

**Dev Server:**
```json
{
  "enabled": true,
  "channelId": "C_DEV_CHANNEL"
}
```

**Production Server:**
```json
{
  "enabled": true,
  "channelId": "C_PROD_CHANNEL",
  "sanitizeMessages": true
}
```

Just run `/slack-notify:setup` on each machine with appropriate settings.

## Security Best Practices

### Token Security

- Configuration file is created with `chmod 600` (owner read/write only)
- Never commit `~/.claude/slack-notify.json` to version control
- Bot token is never logged in full (only last 4 characters)
- Keep your bot token secret

### Message Content

Questions sent to Slack may contain:
- File paths and directory structures
- Code snippets and error messages
- Architecture decisions and implementation details

**Recommendations:**
1. Use a **private channel** (not public)
2. Consider a **dedicated workspace** for sensitive projects
3. Enable `sanitizeMessages: true` to redact paths and secrets
4. Limit channel access to authorized team members only

### Rate Limiting

Default poll interval (45s) is well within Slack's rate limits. The plugin:
- Respects Slack's retry-after headers
- Backs off automatically on 429 responses
- Logs rate limit issues for debugging

## Troubleshooting

### Questions Not Appearing in Slack

1. Check configuration exists: `cat ~/.claude/slack-notify.json`
2. Verify `enabled: true`
3. Test bot token: Run `/slack-notify:test`
4. Check logs: `cat ~/.claude/logs/slack-notify.log`
5. Ensure bot is added to the channel (invite @ClaudeCode to channel)

### Responses Not Reaching Claude

1. Verify you're replying in the correct thread
2. Check poll interval isn't too long
3. Look for timeout messages in Slack
4. Check network connectivity to api.slack.com

### Plugin Not Loading

1. Ensure Node.js v16+ is installed: `node --version`
2. Install dependencies: `cd slack-notify/hooks/PreToolUse && npm install`
3. Verify plugin is linked: `claude-code plugin list`
4. Check hook file is executable

### Still Having Issues?

1. Enable debug logging: Set `"logLevel": "debug"` in config
2. Check logs at `~/.claude/logs/slack-notify.log`
3. Run setup wizard again: `/slack-notify:setup`
4. Test with minimal config (just required fields)

## Limitations

### Current Version

- **Polling Latency:** ~22s average wait (45s interval) before Claude sees response
- **Resource Usage:** Claude process stays running while polling (~100-200MB)
- **Text Responses Only:** Can't upload files/images as answers
- **Single Response:** No mid-execution pause for discussion

### Planned Enhancements

- Socket Mode for real-time responses (eliminate polling delay)
- Conversation mode for multi-turn discussions
- Smart polling with exponential backoff
- Multi-user support with @mentions
- Response templates for common answers

## Comparison to Alternatives

### vs. Phone Call Plugin (call-me)

| Feature | slack-notify | call-me |
|---------|-------------|---------|
| Attention-grabbing | Low | Very High |
| Asynchronous | Yes | No |
| Response history | Yes (logged in Slack) | No |
| Team collaboration | Yes | No |
| Cost | Free | Varies by provider |
| Rich formatting | Yes (buttons, threads) | No |
| Best for | Long tasks, teams | Urgent decisions |

### vs. Email Notifications

| Feature | slack-notify | Email |
|---------|-------------|-------|
| Latency | ~22s average | Minutes to hours |
| Interactive elements | Yes (buttons) | Limited |
| Mobile experience | Excellent | Good |
| Thread conversations | Yes | Yes |
| Real-time feel | Good | Poor |

## Development

### Project Structure

```
slack-notify/
├── .claude-plugin/
│   └── plugin.json              # Plugin metadata
├── hooks/
│   └── PreToolUse/
│       ├── ask-via-slack.js     # Main hook logic
│       └── package.json         # Hook dependencies
├── commands/
│   ├── setup.md                 # Setup wizard
│   ├── test.md                  # Test command
│   └── disable.md               # Toggle command
├── lib/
│   ├── slack-client.js          # Slack API wrapper
│   ├── config-manager.js        # Config read/write
│   └── message-builder.js       # Block Kit formatting
├── README.md                    # This file
└── package.json                 # Plugin metadata
```

### Running Tests

```bash
npm test
```

### Testing the Hook Directly

```bash
cd hooks/PreToolUse
node ask-via-slack.js
```

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Author

Created by [waelouf](https://github.com/waelouf)

## Support

- Issues: https://github.com/waelouf/dev-architect/issues
- Discussions: https://github.com/waelouf/dev-architect/discussions

## Acknowledgments

Inspired by [call-me](https://github.com/ZeframLou/call-me) by ZeframLou
