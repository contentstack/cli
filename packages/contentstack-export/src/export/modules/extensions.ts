import { resolve as pResolve } from 'node:path';
import { FsUtility} from '@contentstack/cli-utilities';

import config from '../../config';
import { log, formatError } from '../../utils';
import BaseClass from './base-class';
import { ModuleClassParams } from '../../types';

export default class ExportAssets extends BaseClass {
  private extensionsFolderPath: string;
  private extensions: Record<string, unknown>;
  public extensionConfig = config.modules.extensions;

  constructor({ exportConfig, stackAPIClient }: ModuleClassParams) {
    super({ exportConfig, stackAPIClient });
    this.extensions ={}
  }

  get queryParam(): Record<string, unknown> {
    return {
      asc: 'updated_at',
      include_count: true,
    };
  }

  async start(): Promise<void> {
    log(this.exportConfig, 'Starting extension export', 'info');

    this.extensionsFolderPath = pResolve(
      this.exportConfig.data,
      this.exportConfig.branchName || '',
      this.extensionConfig.dirName,
    );

    await this.getExtensions();
  }

  async getExtensions(): Promise<void>{
    const extensions = await this.stack
    .extension()
    .query(this.queryParam)
    .find()
    .then((data: any) => data)
    .catch(({ error }: any) => {
      log(this.exportConfig, `Failed to export extensions ${formatError(error)}`, 'error');
      log(this.exportConfig, error, 'error');
    })

    if(extensions?.items?.length){
      for(let index=0; index< extensions?.count; index++){
        const extUid = extensions.items[index].uid;
        this.extensions[extUid] = extensions.items[index];  
      }
      new FsUtility({ basePath: this.extensionsFolderPath }).writeFile(
        pResolve(this.extensionsFolderPath, this.extensionConfig.fileName),
        this.extensions,
      );
      log(this.exportConfig, 'All the extensions have been exported successfully!', 'success');
    }else{
      log(this.exportConfig, 'No extensions found', 'info');
    }
  }
}