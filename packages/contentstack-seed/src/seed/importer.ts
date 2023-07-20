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
  alias?: string;
}

export async function run(options: ImporterOptions) {
  const importPath = path.resolve(options.tmpPath, STACK_FOLDER);

  const args = options.alias
    ? ['-k', options.api_key, '-d', importPath, '--alias', options.alias!]
    : ['-k', options.api_key, '-d', importPath];

  process.chdir(options.tmpPath);
  await ImportCommand.run(args);
}
