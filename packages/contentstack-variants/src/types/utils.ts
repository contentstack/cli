export interface AnyProperty {
  [propName: string]: any;
}

export interface LogType {
  (message: any): void;
  (config: any, message: any, type: 'info' | 'error' | 'success'): void;
}
