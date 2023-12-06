type AppLocation =
  | 'cs.cm.stack.config'
  | 'cs.cm.stack.dashboard'
  | 'cs.cm.stack.sidebar'
  | 'cs.cm.stack.custom_field'
  | 'cs.cm.stack.rte'
  | 'cs.cm.stack.asset_sidebar'
  | 'cs.org.config';

interface ExtensionMeta {
  uid?: string;
  name?: string;
  description?: string;
  path?: string;
  signed: boolean;
  extension_uid?: string;
  data_type?: string;
  enabled?: boolean;
  width?: number;
  blur?: boolean;
  default_width?: 'full' | 'half';
}

interface Extension {
  type: AppLocation;
  meta: ExtensionMeta[];
}

interface LocationConfiguration {
  signed: boolean;
  base_url: string;
  locations: Extension[];
}

interface AnyProperty {
  [propName: string]: any;
}

type Manifest = {
  uid: string;
  name: string;
  icon?: string;
  hosting?: any;
  version?: number;
  description: string;
  organization_uid: string;
  framework_version?: string;
  oauth?: any;
  webhook?: any;
  ui_location: LocationConfiguration;
  target_type: 'stack' | 'organization';
  visibility: 'private' | 'public' | 'public_unlisted';
} & AnyProperty;

type Installation = {
  uid: string;
  status: string;
  manifest: Manifest;
  configuration: any;
  server_configuration: any;
  target: { type: string; uid: string };
  ui_location: LocationConfiguration;
} & AnyProperty;

export { Installation, Manifest };
