
import { FsUtility } from '@contentstack/cli-utilities';
import { IVariantFileHandler } from './interfaces';

export class VariantFileHandler implements IVariantFileHandler {
  constructor(private readonly basePath: string) {}

  async readVariantFile(filePath: string): Promise<any> {
    const fsUtility = new FsUtility({ 
      basePath: this.basePath,
      indexFileName: 'index.json',
      createDirIfNotExist: false 
    });

    return fsUtility.readFile(filePath);
  }

  async writeVariantFile(filePath: string, content: any): Promise<void> {
    const fsUtility = new FsUtility({ 
      basePath: this.basePath,
      indexFileName: 'index.json',
      createDirIfNotExist: false 
    });

    fsUtility.writeFile(filePath, JSON.stringify(content, null, 2));
  }
}