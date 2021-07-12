import { v4 as uuidv4 } from 'uuid';
import { configHandler } from '@contentstack/utilities';
import internalConfig from '../config';

export default class CsdxContext {
  readonly id: string;
  readonly user?: object;
  readonly region?: object;
  readonly config: object;
  readonly info: object;
  readonly plugin: object;

  constructor(cliOpts: any) {
    const config = configHandler.init();
    let sessionId = configHandler.get('sessionId');
    if (!sessionId) {
      sessionId = uuidv4();
      configHandler.set('sessionId', sessionId);
    }

    this.id = sessionId;
    this.user = {
      authtoken: configHandler.get('authtoken'),
      email: configHandler.get('email'),
    };
    this.config = { ...config };
    this.region = configHandler.get('region');
    this.info = { command: cliOpts.id };
    this.plugin = {
      name: cliOpts.id ? cliOpts.id.match(internalConfig.commandRegexPattern)[1] : 'core',
    };
  }

  getToken(alias: string) {
    if (alias) {
      const token = configHandler.get(`tokens.${alias}`);
      if (token) return token;
    }
    // TBD throw new CLIError({});
  }
}
