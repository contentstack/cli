import * as process from 'process';
import * as path from 'path';
import ImportCommand from '@contentstack/cli-cm-import';

const STACK_FOLDER = 'stack';

export interface ImporterOptions {
  master_locale: string;
  api_key: string;
  tmpPath: string;
  cmaHost: string;
  cdaHost: string;
  isAuthenticated: boolean;
}

export async function run(options: ImporterOptions) {
  const importPath = path.resolve(options.tmpPath, STACK_FOLDER);

  process.chdir(options.tmpPath);
  await ImportCommand.run(['-k', options.api_key, '-d', importPath]);
}
