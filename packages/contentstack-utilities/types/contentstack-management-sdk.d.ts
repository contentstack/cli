import { ContentstackClient, ContentstackConfig } from '@contentstack/management';
declare class ManagementSDKInitiator {
    private analyticsInfo;
    constructor();
    init(context: any): void;
    createAPIClient(config: any): Promise<ContentstackClient>;
}
export declare const managementSDKInitiator: ManagementSDKInitiator;
declare const _default: any;
export default _default;
export { ContentstackConfig, ContentstackClient };
