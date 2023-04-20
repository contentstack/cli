import { Command } from '@contentstack/cli-utilities';
import { Region } from './interfaces';
declare abstract class ContentstackCommand extends Command {
  private _email;
  private _region;
  private _rateLimit;
  private _authToken;
  private _deliveryAPIClient;
  get context(): any;
  get email(): string;
  get deliveryAPIClient(): any;
  get region(): Region;
  get rateLimit(): string | 5;
  get cmaHost(): string;
  get cdaHost(): string;
  get uiHost(): string;
  get cdaAPIUrl(): string;
  get cmaAPIUrl(): string;
  get authToken(): string;
  getToken(alias: any): any;
}
export { ContentstackCommand as Command };
