import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { configHandler, formatDate, formatTime, createLogContext } from '..';
import { getLogPath } from './log';

/**
 * Extract module name from command ID
 * Example: "cm:stacks:audit" -> "audit"
 */
function extractModule(commandId: string): string {
  if (!commandId || commandId === 'unknown') {
    return '';
  }
  // Split by colon and get the last part
  const parts = commandId.split(':');
  return parts[parts.length - 1] || '';
}

/**
 * Generate session metadata object for session.json
 * Uses createLogContext() to get base context, then adds session-specific metadata
 */
function generateSessionMetadata(
  commandId: string,
  sessionId: string,
  startTimestamp: Date,
): Record<string, any> {
  const originalCommandId = configHandler.get('currentCommandId') || commandId;
  const module = extractModule(originalCommandId);
  const apiKey = configHandler.get('apiKey') || '';
  
  const baseContext = createLogContext(originalCommandId, apiKey);

  return {
    ...baseContext,
    module: module,
    sessionId: sessionId,
    startTimestamp: startTimestamp.toISOString(),
    MachineEnvironment: {
      nodeVersion: process.version,
      os: os.platform(),
      hostname: os.hostname(),
      CLI_VERSION: configHandler.get('CLI_VERSION') || '',
    },
  };
}

/**
 * Create session.json metadata file in the session directory
 */
function createSessionMetadataFile(sessionPath: string, metadata: Record<string, any>): void {
  const metadataPath = path.join(sessionPath, 'session.json');
  try {
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
  } catch (error) {
    // Silently fail if metadata file cannot be created
    // Logging here would cause circular dependency
    // The session folder and logs will still be created
  }
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
  const isNewSession = !fs.existsSync(sessionPath);
  if (isNewSession) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }

  // Create session.json metadata file for new sessions
  // This ensures metadata is created before any logs are written
  if (isNewSession) {
    const metadata = generateSessionMetadata(
      configHandler.get('currentCommandId') || commandId,
      sessionId,
      now,
    );
    createSessionMetadataFile(sessionPath, metadata);
  }

  return sessionPath;
}

