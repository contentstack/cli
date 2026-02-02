import getCallsites from 'callsites';
import { parse, resolve } from 'path';
import { pathValidator, sanitizePath } from '@contentstack/cli-utilities';

function getFileDirectory(path: string): string {
  const parentPath = pathValidator(resolve(sanitizePath(path), '../')); // Assuming that will be 2 folders up
  return parse(parentPath).dir;
}

export default (): any => {
  const thisDir = getFileDirectory(__filename);
  const callsites = getCallsites();

  const externalFile = callsites.find((callsite: any) => {
    const currentDir = getFileDirectory(callsite.getFileName());
    const isNotThisDir = thisDir !== currentDir;
    return isNotThisDir;
  });

  return externalFile;
};
