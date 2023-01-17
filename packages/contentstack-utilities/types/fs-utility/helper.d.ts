declare function mapKeyAndVal(array: Array<Record<string, any>>, keyName: string | string[], omitKeys?: Array<string>): Record<string, unknown>;
declare function getMetaData(array: Array<Record<string, any>>, pickKeys: Array<string>, handler?: (array: Array<Record<string, any>>) => void): Array<Record<string, unknown>> | undefined;
export { mapKeyAndVal, getMetaData };
