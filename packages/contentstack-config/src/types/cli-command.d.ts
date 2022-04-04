// import { Region } from '../interfaces';

declare module '@contentstack/cli-command' {
  import { Command as OclifCommand, flags } from '@oclif/command';

  export { flags };

  export abstract class Command extends OclifCommand {
    get email(): string;

    get region(): any;

    get cmaHost(): string;

    get cdaHost(): string;

    get cdaAPIUrl(): string;

    get authToken(): string;

    get deliveryAPIClient(): any;

    get managementAPIClient(): any;

    getToken(alias: string): { token: string; apiKey: string; environment: string; type: string };
  }
}
