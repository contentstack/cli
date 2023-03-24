import * as process from 'process';
import * as path from 'path';
import importCmd from '@contentstack/cli-cm-import';

const STACK_FOLDER = 'stack';

export interface ImporterOptions {
  master_locale: string;
  authToken: string;
  api_key: string;
  tmpPath: string;
  cmaHost: string;
  cdaHost: string;
}

export async function run(options: ImporterOptions) {
  const importPath = path.resolve(options.tmpPath, STACK_FOLDER);

  process.chdir(options.tmpPath);

  await importCmd.run(['-k', options.api_key, '-d', importPath]);
}
