import { AnyProperty } from "@contentstack/management/types/utility/fields";
import { Pagination } from "@contentstack/management/types/utility/pagination";

type QueryType = {
  find: () => Promise<void> | Promise<never>;
  count: () => Promise<void> | Promise<never>;
  findOne: () => Promise<void> | Promise<never>;
};
type AssetType = {
  query: (param?: Pagination & AnyProperty) => QueryType;
  download: () => Promise<void> | Promise<never>;
  fetch: (param?: AnyProperty) => Promise<void> | Promise<never>;
};
type StackType = {
  query: (param?: Pagination & AnyProperty) => QueryType;
  asset: (uid?: string) => AssetType;
  fetch: (param?: AnyProperty) => Promise<void> | Promise<never>;
};

type SdkType = {
  stack: () => StackType;
};

export function sdk(mocData: any = {}): SdkType {
  const {
    findOneData,
    findData,
    countData,
    fetchData,
    downloadData,
    findResolve = true,
    fetchResolve = true,
    assetResolve = true,
    countResolve = true,
    findOneResolve = true,
  } = mocData;

  const query = (param?: Pagination & AnyProperty): QueryType => {
    return {
      find: () => {
        return Promise[findResolve ? 'resolve' : 'reject'](findData);
      },
      count: () => {
        return Promise[countResolve ? 'resolve' : 'reject'](countData);
      },
      findOne: () => {
        return Promise[findOneResolve ? 'resolve' : 'reject'](findOneData);
      },
    };
  };

  const asset = (uid?: string): AssetType => {
    return {
      query,
      fetch: (param?: AnyProperty) => {
        return Promise[fetchResolve ? 'resolve' : 'reject'](fetchData);
      },
      download: () => Promise[assetResolve ? 'resolve' : 'reject'](downloadData),
    };
  };

  const stack = (): StackType => {
    return {
      query,
      asset,
      fetch: (param?: AnyProperty) => {
        return Promise[fetchResolve ? 'resolve' : 'reject'](fetchData);
      },
    };
  };

  return { stack };
}

export function client(mocData: any = {}): StackType {
  return sdk(mocData).stack();
}
