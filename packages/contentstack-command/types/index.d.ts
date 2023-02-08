import { Command, Flags } from '@oclif/core';
import { Region } from './interfaces';
declare abstract class ContentstackCommand extends Command {
  private _managementAPIClient;
  private _email;
  private _region;
  private _rateLimit;
  private _authToken;
  private _deliveryAPIClient;
  get context(): any;
  get managementAPIClient(): object;
  set managementAPIClient(params: object);
  get email(): string;
  get deliveryAPIClient(): any;
  get region(): Region;
  get rateLimit(): string | 5;
  get cmaHost(): string;
  get cdaHost(): string;
  get cdaAPIUrl(): string;
  get cmaAPIUrl(): string;
  get authToken(): string;
  getToken(alias: any): any;
  isAuthenticated(): any;
}
export { ContentstackCommand as Command, Flags as flags };
