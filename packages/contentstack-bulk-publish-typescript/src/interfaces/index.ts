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

export interface FormattedLogs {
  entries?: Array<any>;
  locale?: Array<any>;
  environments?: Array<any>;
  api_key?: string;
  type?: string;
  assets?: Array<any>;
}

export interface ConfigFile {
  alias?: string;
  apikey?: string;
  contentTypes?: Array<string>;
  apiEndPoint?: string;
  manageToken?: string;
  cdnEndPoint?: string;
  deliveryToken?: string;
  apiVersion?: number;
  publish_unpublished_env?: {
    contentTypes: Array<string>;
    sourceEnv: string;
    locale: string;
    environments: Array<string>;
    bulkPublish: boolean;
  };
  publish_assets?: {
    environments: Array<string>;
    folderUid: string;
    bulkPublish: boolean;
  };
  publish_entries?: {
    contentTypes: Array<string>;
    locales: Array<string>;
    environments: Array<string>;
    publishAllContentTypes: boolean;
    bulkPublish: boolean;
  };
  cross_env_publish?: {
    filter: {
      environment: string;
      content_type_uid: string;
      locale: string;
      type: string;
    };
    deliveryToken: string;
    destEnv: Array<string>;
    bulkPublish: boolean;
  };
  publish_edits_on_env?: {
    contentTypes: Array<string>;
    sourceEnv: string;
    environments: Array<string>;
    locales: Array<string>;
    bulkPublish: boolean;
  };
  nonlocalized_field_changes?: {
    sourceEnv: string;
    contentTypes: Array<string>;
    environments: Array<string>;
    bulkPublish: boolean;
  };
  addFields?: {
    deleteFields: Array<string>;
    locales: Array<string>;
    contentTypes: Array<string>;
    environments: Array<string>;
    defaults: any;
    bulkPublish: boolean;
  };
  Unpublish?: {
    filter: {
      environment: string;
      content_type_uid: string;
      locale: string;
      type: string;
    };
    deliveryToken: string;
    bulkUnpublish: boolean;
  };
}