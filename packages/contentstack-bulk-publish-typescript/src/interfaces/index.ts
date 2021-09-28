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

// eslint-disable-next-line @typescript-eslint/no-redeclare
export interface AuthOptions {
  contentstackClient: any;
}

// TBD
export interface ContentStackManagementClient {
  contentstackClient: object;
	stack: Function;
}

export interface PrintOptions {
  color?: string;
}

export interface InquirePayload {
  type: string;
  name: string;
  message: string;
  choices?: Array<any>;
  transformer?: Function;
	loop?: boolean;
	validate?: Function;
}

export interface User {
  email: string;
  authtoken: string;
}

export interface Token {
	apiKey: string;
	token: string;
}