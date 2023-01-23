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
  create: (param?: AnyProperty) => Promise<void> | Promise<never>;
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

export function sdk(mocData: any = {}): SdkType {
  const {
    findData,
    countData,
    fetchData,
    publishData,
    findOneData,
    downloadData,
    assetsCreateData,
    folderCreateData,
    findResolve = true,
    fetchResolve = true,
    countResolve = true,
    findOneResolve = true,
    replaceResolve = true,
    publishResolve = true,
    downloadResolve = true,
    folderCreateResolve = true,
    assetsCreateResolve = true,
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

  const create = (resolver = true, data) => {
    return Promise[resolver ? 'resolve' : 'reject'](data);
  };
  const folder = () => {
    return { create: () => create(folderCreateResolve, folderCreateData) };
  };

  const asset = (uid?: string): AssetType => {
    return {
      query,
      folder,
      create: () => create(assetsCreateResolve, assetsCreateData),
      fetch: (param?: AnyProperty) => {
        return Promise[fetchResolve ? 'resolve' : 'reject'](fetchData);
      },
      download: () => Promise[downloadResolve ? 'resolve' : 'reject'](downloadData),
      publish: (data: any) => Promise[publishResolve ? 'resolve' : 'reject'](publishData),
      replace: (data: any) => Promise[replaceResolve ? 'resolve' : 'reject'](downloadData),
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
