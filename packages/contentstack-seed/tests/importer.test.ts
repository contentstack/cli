jest.mock('@contentstack/cli-cm-import/src/lib/util/import-flags');
jest.mock('path');

import * as process from 'process';
import * as path from 'path';
import * as importer from '../src/seed/importer';

const template = 'stack';
const tmpPath = '/var/tmp';

describe('importer', () => {
  test('should cwd into temp path', () => {
    // eslint-disable-next-line
    const chdirMock = jest.spyOn(process, 'chdir').mockImplementation(() => {});

    importer.run({
      api_key: '',
      cdaHost: '',
      cmaHost: '',
      master_locale: '',
      tmpPath: tmpPath,
    });

    expect(path.resolve).toHaveBeenCalledWith(tmpPath, template);
    expect(chdirMock).toHaveBeenCalledWith(tmpPath);
  });
});
