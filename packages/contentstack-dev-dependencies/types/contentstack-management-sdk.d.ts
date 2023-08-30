import { AnyProperty } from '@contentstack/management/types/utility/fields';
import { Pagination } from '@contentstack/management/types/utility/pagination';
type QueryType = {
    find: () => Promise<void> | Promise<never>;
    count: () => Promise<void> | Promise<never>;
    findOne: () => Promise<void> | Promise<never>;
};
type AssetType = {
    query: (param?: Pagination & AnyProperty) => QueryType;
    download: () => Promise<void> | Promise<never>;
    replace: (data: any) => Promise<void> | Promise<never>;
    publish: (data: any) => Promise<void> | Promise<never>;
    fetch: (param?: AnyProperty) => Promise<void> | Promise<never>;
    folder: () => {
        create: (param?: AnyProperty) => Promise<void> | Promise<never>;
    };
};
type StackType = {
    query: (param?: Pagination & AnyProperty) => QueryType;
    asset: (uid?: string) => AssetType;
    fetch: (param?: AnyProperty) => Promise<void> | Promise<never>;
};
type SdkType = {
    stack: () => StackType;
};
export declare function sdk(mocData?: any): SdkType;
export declare function client(mocData?: any): StackType;
export {};
