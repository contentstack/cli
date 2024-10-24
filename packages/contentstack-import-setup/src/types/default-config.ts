import { Modules } from '.';

export default interface DefaultConfig {
  host: string;
  modules: {
    'custom-roles': {
      dirName: string;
      fileName: string;
      dependencies: Modules[];
    };
    environments: {
      dirName: string;
      fileName: string;
      dependencies?: Modules[];
    };
    extensions: {
      dirName: string;
      fileName: string;
      dependencies?: Modules[];
    };
    assets: {
      dirName: string;
      fileName: string;
      dependencies?: Modules[];
      fetchConcurrency: number;
    };
    'content-types': {
      dirName: string;
      fileName: string;
      dependencies: Modules[];
    };
    entries: {
      dirName: string;
      fileName: string;
      dependencies: Modules[];
    };
    'global-fields': {
      dirName: string;
      fileName: string;
      dependencies: Modules[];
    };
    'marketplace-apps': {
      dirName: string;
      fileName: string;
      dependencies?: Modules[];
    };
    taxonomies: {
      dirName: string;
      fileName: string;
      dependencies?: Modules[];
    };
  };
  fetchConcurrency: number;
}
