declare module '@contentstack/cli-command' {
    import {Command as OclifCommand, flags} from '@oclif/command'

    export {flags}

    export class Command extends OclifCommand {
      get email(): string;

      get region(): string;

      get cmaHost(): string;

      get cdaHost(): string;

      get cdaAPIUrl(): string;

      get authToken(): string;

      get deliveryAPIClient(): any;

      get managementAPIClient(): any;

      getToken(alias: string): { token: string; apiKey: string; environment: string; type: string };

      run(): PromiseLike<any>;
    }
}
