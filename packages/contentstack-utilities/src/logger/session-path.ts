import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as shortUUID from 'short-uuid';
import { configHandler } from '..';

/**
 * Get the log path for centralized logging
 * Priority:
 * 1. CS_CLI_LOG_PATH environment variable (user override)
 * 2. User config (log.path from CLI config)
 * 3. Current working directory + logs (where user ran the command)
 * 4. Home directory (~/contentstack/logs) (fallback)
 */
function getLogPath(): string {
  // 1. Environment variable override
  if (process.env.CS_CLI_LOG_PATH) {
    return process.env.CS_CLI_LOG_PATH;
  }

  // 2. User configured path
  const configuredPath = configHandler.get('log.path');
  if (configuredPath) {
    return configuredPath;
  }

  // 3. Use current working directory (where user ran the command)
  try {
    const cwdPath = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(cwdPath)) {
      fs.mkdirSync(cwdPath, { recursive: true });
    }
    fs.accessSync(cwdPath, fs.constants.W_OK);
    return cwdPath;
  } catch (error) {
    // If current directory is not writable, fall back to home directory
  }

  // 4. Fallback to home directory
  return path.join(os.homedir(), 'contentstack', 'logs');
}

/**
 * Get the session-based log path for date-organized logging
 * Structure: {basePath}/{YYYY-MM-DD}/{command}-{YYYYMMDD-HHMMSS}-{sessionId}/
 * 
 * @returns The session-specific log directory path
 */
export function getSessionLogPath(): string {
  // Get base log path
  const basePath = getLogPath();

  // Get current date in YYYY-MM-DD format
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD

  // Get command ID (fallback to 'unknown' if not set)
  let commandId = configHandler.get('currentCommandId') || 'unknown';
  // Sanitize command ID - remove colons and replace with hyphens for folder name
  commandId = commandId.replace(/:/g, '-');

  // Get sessionId (fallback to short UUID if not set)
  let sessionId = configHandler.get('sessionId');
  if (!sessionId) {
    sessionId = shortUUID.generate();
    configHandler.set('sessionId', sessionId);
  }

  // Get timestamp in YYYYMMDD-HHMMSS format
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const timestamp = `${year}${month}${day}-${hours}${minutes}${seconds}`;

  // Create session folder name: command-YYYYMMDD-HHMMSS-sessionId
  const sessionFolderName = `${commandId}-${timestamp}-${sessionId}`;

  // Build full session path
  const sessionPath = path.join(basePath, dateStr, sessionFolderName);

  // Ensure directory exists
  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }

  return sessionPath;
}

