import * as process from 'process'
import * as path from 'path'

const STACK_FOLDER = 'stack'

export interface ImporterOptions {
  master_locale: string;
  authToken: string;
  api_key: string;
  tmpPath: string;
  cmaHost: string;
  cdaHost: string;
}

export async function run(options: ImporterOptions) {
  const importPath = path.resolve(options.tmpPath, STACK_FOLDER)

  process.chdir(options.tmpPath)

  // moving here to fix jest testing bug
  const {parametersWithAuthToken} = require('@contentstack/cli-cm-import/src/lib/util/import-flags')

  parametersWithAuthToken(
    options.master_locale,
    options.authToken,
    options.api_key,
    importPath,
    '',
    {
      cma: options.cmaHost,
      cda: options.cdaHost,
    }
  )
}
