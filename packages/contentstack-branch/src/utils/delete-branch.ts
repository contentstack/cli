import { cliux, managementSDKClient } from '@contentstack/cli-utilities';
import { refreshbranchConfig } from '.';

export async function deleteBranch(host: string, apiKey: string, uid: string) {
  const managementAPIClient = await managementSDKClient({ host });
  return managementAPIClient
    .stack({ api_key: apiKey })
    .branch(uid)
    .delete()
    .then(() => cliux.success(`${uid} Branch has been deleted`))
    .then(() => refreshbranchConfig(apiKey, uid))
    .catch((err) => {
      if (err.errorCode === 905) {
        cliux.error(`Branch with UID ${uid} does not exist`);
      } else if (err.errorCode === 909) {
        const errorOutput = err.errors.branch[0];
        cliux.error(errorOutput);
      } else {
        cliux.error(err.errorMessage);
      }
    });
}
