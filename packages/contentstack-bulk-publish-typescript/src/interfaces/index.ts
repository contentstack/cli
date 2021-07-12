export interface OclifConfig {
	runHook: Function;
}

export interface Region {
	cma: string;
	cda: string;
	name: string;
}

export interface PublishDetails {

}

export interface Environment {

}

export interface StackSDK {
	
}

export interface Entry {
	uid: string;
	content_type: string;
	locale: string;
	publish_details: Array<PublishDetails>;
}

export interface QueueStoreObject {
	entries?: Array<Entry>;
	content_type?: string;
	publish_details: PublishDetails;
	environments: Array<Environment>;
	entryUid?: string;
	locale?: string;
	Type?: string;
	stack?: StackSDK;
}