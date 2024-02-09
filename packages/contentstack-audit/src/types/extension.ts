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

type MarketplaceAppsInstallationData = {
  uid: string;
  status: string;
  configuration: any;
  server_configuration: any;
  target: { type: string; uid: string };
  ui_location: LocationConfiguration;
} & AnyProperty;

interface AnyProperty {
  [propName: string]: any;
}

export { MarketplaceAppsInstallationData };