/**
 * @class
 * Auth handler
 */
declare class AuthHandler {
  private _client;
  private _host;
  private _appHost;
  private codeVerifier;
  private OAuthBaseURL;
  private OAuthAppId;
  private OAuthClientId;
  private OAuthRedirectURL;
  private OAuthScope;
  private OAuthResponseType;
  private authTokenKeyName;
  private authEmailKeyName;
  private oauthAccessTokenKeyName;
  private oauthDateTimeKeyName;
  private oauthUserUidKeyName;
  private oauthOrgUidKeyName;
  private oauthRefreshTokenKeyName;
  private authorisationTypeKeyName;
  private authorisationTypeOAUTHValue;
  private authorisationTypeAUTHValue;
  private allAuthConfigItems;
  set host(contentStackHost: any);
  constructor();
  oauth(): Promise<object>;
  createHTTPServer(): Promise<object>;
  openOAuthURL(): Promise<object>;
  getAccessToken(code: string): Promise<object>;
  setConfigData(type: string, userData?: any): Promise<object>;
  unsetConfigData(type?: string): Promise<void>;
  refreshToken(): Promise<object>;
  getUserDetails(data: any): Promise<object>;
  isAuthenticated(): Promise<boolean>;
  checkExpiryAndRefresh: (force?: boolean) => Promise<void | object>;
  compareOAuthExpiry(force?: boolean): Promise<void | object>;
  getAuthorisationType(): Promise<boolean>;
  isAuthorisationTypeBasic(): Promise<boolean>;
  isAuthorisationTypeOAuth(): Promise<boolean>;
}
declare const _default: AuthHandler;
export default _default;
