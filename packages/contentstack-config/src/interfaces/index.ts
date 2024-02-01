export interface PrintOptions {
  color?: string;
}

export interface InquirePayload {
  type: string;
  name: string;
  message: string;
  choices?: Array<any>;
  transformer?: Function;
}

export interface Region {
  name: string;
  cma: string;
  cda: string;
  uiHost: string;
}
