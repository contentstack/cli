import * as fs from 'fs';
import * as path from 'path';
import { configHandler, formatDate, formatTime } from '..';
import { getLogPath } from './log';

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
  commandId = commandId?.replace(/:/g, '-');

  // Use helper methods to format date and time
  const dateStrFormatted = formatDate(now); // YYYYMMDD
  const timeStrFormatted = formatTime(now); // HHMMSS
  const timestamp = `${dateStrFormatted}-${timeStrFormatted}`; // YYYYMMDD-HHMMSS

  let sessionId = configHandler.get('sessionId');
  if (!sessionId) {
    // Format: first 8 chars of command + timestamp (YYYYMMDDHHMMSS)
    const timestampForId = `${dateStrFormatted}${timeStrFormatted}`; // YYYYMMDDHHMMSS
    const commandHash = commandId.substring(0, 8).padEnd(8, '0'); // Use first 8 chars of command
    sessionId = `${commandHash}-${timestampForId}`;
  }

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

