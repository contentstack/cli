interface selectedOrganization {
    orgUid: string;
    orgName: string;
}
interface Stack {
    name: string;
    api_key: string;
}
interface ContentType {
    uid: string;
    title: string;
}
interface Entry {
    uid: string;
    title: string;
}
export declare function chooseOrganization(displayMessage?: string, region?: string, orgUid?: string): Promise<selectedOrganization>;
export declare function chooseStack(organizationId: string, displayMessage?: string, region?: string): Promise<Stack>;
export declare function chooseContentType(stackApiKey: string, displayMessage?: string, region?: string): Promise<ContentType>;
export declare function chooseEntry(contentTypeUid: string, stackApiKey: string, displayMessage?: string, region?: string): Promise<Entry>;
export {};
