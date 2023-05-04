import { cliux, managementSDKClient } from '@contentstack/cli-utilities';
import { refreshbranchConfig } from '.';

export async function deleteBranch(host: string, apiKey: string, uid: string) {
  const managementAPIClient = await managementSDKClient({ host });
  return managementAPIClient
    .stack({ api_key: apiKey })
    .branch(uid)
    .delete()
    .then(() => cliux.success(`Branch with UID '${uid}' has been deleted`))
    .then(() => refreshbranchConfig(apiKey, uid))
    .catch((err) => {
      if (err.errorCode === 905) {
        cliux.error(`error: Branch with UID ${uid} does not exist`);
      } else if (err.errorCode === 909) {
        let errorMsg: string;
        if(err.errors?.branch){
          const errorOutput = err.errors.branch[0];
          errorMsg = `${err.errorMessage} ${errorOutput}`;
        }else{
          errorMsg = err.errorMessage;
        }
        cliux.error(`error: ${errorMsg}`);
      } else {
        cliux.error(`error: ${err.errorMessage}`);
      }
    });
}
