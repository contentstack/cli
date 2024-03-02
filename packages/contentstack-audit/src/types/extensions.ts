export interface Extension {
  stackHeaders: {
    api_key: string;
  };
  urlPath: string;
  uid: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  tags?: [];
  _version: number;
  title: string;
  config: {};
  type: 'field';
  data_type: string;
  multiple: boolean;
  srcdoc?: string;
  scope: {
    content_types: string[];
  };
  content_types?: string[];
  fixStatus?: string;
}
