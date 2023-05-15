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
};
type StackType = {
  query: (param?: Pagination & AnyProperty) => QueryType;
  asset: (uid?: string) => AssetType;
  fetch: (param?: AnyProperty) => Promise<void> | Promise<never>;
};

type SdkType = {
  stack: () => StackType;
};

export function sdk(mocData: any = {}, resolve = true): SdkType {
  const { findOneData, findData, countData, fetchData, downloadData } = mocData;

  const query = (param?: Pagination & AnyProperty): QueryType => {
    return {
      find: () => {
        return Promise[resolve ? 'resolve' : 'reject'](findData);
      },
      count: () => {
        return Promise[resolve ? 'resolve' : 'reject'](countData);
      },
      findOne: () => {
        return Promise[resolve ? 'resolve' : 'reject'](findOneData);
      },
    };
  };

  const asset = (uid?: string): AssetType => {
    return {
      query,
      download: () => Promise[resolve ? 'resolve' : 'reject'](downloadData),
    };
  };

  const stack = (): StackType => {
    return {
      query,
      asset,
      fetch: (param?: AnyProperty) => {
        return Promise[resolve ? 'resolve' : 'reject'](fetchData);
      },
    };
  };

  return { stack };
}

export function client(mocData: any = {}, resolve = true): StackType {
  return sdk(mocData, resolve).stack();
}
