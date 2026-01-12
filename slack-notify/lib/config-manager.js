const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_FILENAME = '.claude/slack-notify.json';

/**
 * Get the path to the config file
 */
function getConfigPath() {
  return path.join(os.homedir(), CONFIG_FILENAME);
}

/**
 * Read configuration from disk
 * Returns null if config doesn't exist or is invalid
 */
function readConfig() {
  const configPath = getConfigPath();

  try {
    if (!fs.existsSync(configPath)) {
      return null;
    }

    const content = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(content);

    // Validate required fields
    if (!config.botToken || !config.channelId) {
      console.error('[slack-notify] Config missing required fields (botToken, channelId)');
      return null;
    }

    // Apply defaults for optional fields
    return {
      enabled: config.enabled !== false, // Default to true
      botToken: config.botToken,
      channelId: config.channelId,
      pollIntervalSeconds: config.pollIntervalSeconds || 45,
      timeoutMinutes: config.timeoutMinutes || 30,
      logLevel: config.logLevel || 'info',
      sanitizeMessages: config.sanitizeMessages || false
    };
  } catch (error) {
    console.error('[slack-notify] Error reading config:', error.message);
    return null;
  }
}

/**
 * Write configuration to disk
 */
function writeConfig(config) {
  const configPath = getConfigPath();

  try {
    // Ensure .claude directory exists
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Write config with pretty formatting
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');

    // Set restrictive permissions (owner read/write only)
    fs.chmodSync(configPath, 0o600);

    return true;
  } catch (error) {
    console.error('[slack-notify] Error writing config:', error.message);
    return false;
  }
}

/**
 * Update specific config values
 */
function updateConfig(updates) {
  const config = readConfig() || {};
  const newConfig = { ...config, ...updates };
  return writeConfig(newConfig);
}

/**
 * Check if Slack notifications should be used
 */
function shouldUseSlack() {
  const config = readConfig();

  if (!config) {
    return false;
  }

  if (!config.enabled) {
    return false;
  }

  if (!config.botToken || !config.channelId) {
    console.error('[slack-notify] Missing botToken or channelId');
    return false;
  }

  return true;
}

/**
 * Sanitize sensitive information from messages
 */
function sanitizeMessage(message, sanitize = false) {
  if (!sanitize) {
    return message;
  }

  let sanitized = message;

  // Redact file paths (Windows and Unix style)
  sanitized = sanitized.replace(/[A-Z]:\\[\w\\\-\.]+/gi, '[PATH]');
  sanitized = sanitized.replace(/\/[\w\/\-\.]+/g, '[PATH]');

  // Redact potential API keys/tokens (long alphanumeric strings)
  sanitized = sanitized.replace(/\b[A-Za-z0-9]{32,}\b/g, '[REDACTED]');

  return sanitized;
}

module.exports = {
  getConfigPath,
  readConfig,
  writeConfig,
  updateConfig,
  shouldUseSlack,
  sanitizeMessage
};
