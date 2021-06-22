import { v4 as uuidv4 } from 'uuid';
import * as Configstore from 'configstore';
import logger from './logger';
import CLIError from './cli-error';

const config = new Configstore('contentstack_cli');
/**
 * Generate or return an RFC version 4 (random) UUID
 * If UUID already stored in config it will return that
 * Mainly used to maintain uniqueness in Analytics
 * @returns {string} a version 4 UUID
 */
export default function (): string {
  try {
    let uuid = config.get('uuid');
    if (!uuid) {
      uuid = config.set('uuid', uuidv4());
    }
    return uuid;
  } catch (error) {
    logger.debug('Uuid generation error', error);
    throw new CLIError({ message: 'CLI_CORE_FAILED_UUID_GENERATION' });
  }
}
