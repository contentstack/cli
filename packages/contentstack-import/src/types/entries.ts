type EntryJsonRTEFieldDataType = {
  uid?: string;
  type?: string;
  text?: string;
  attrs?: { 'entry-uid'?: string; type?: string } & Record<string, any>;
  children?: EntryJsonRTEFieldDataType[];
};

export { EntryJsonRTEFieldDataType };
