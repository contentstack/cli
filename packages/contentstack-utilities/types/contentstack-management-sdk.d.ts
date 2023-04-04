import { ContentstackClient, ContentstackConfig } from '@contentstack/management';
declare class ManagementSDKInitiator {
  private analyticsInfo;
  constructor();
  init(context: any): void;
  createAPIClient(config: any): Promise<ContentstackClient>;
}
declare const _default: (config: any) => Promise<ContentstackClient>;
export declare const managementSDKInitiator: ManagementSDKInitiator;
export default _default;
export { ContentstackConfig, ContentstackClient };
