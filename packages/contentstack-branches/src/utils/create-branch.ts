import { cliux, managementSDKClient } from '@contentstack/cli-utilities';

export async function createBranch(host: string, apiKey: string, branch: { uid: string; source: string }) {
  const managementAPIClient = await managementSDKClient({ host });
  managementAPIClient
    .stack({ api_key: apiKey })
    .branch()
    .create({ branch })
    .then(() =>
      cliux.success(
        'Branch creation in progress. Once ready, it will show in the results of the branch list command `csdx cm:branches`',
      ),
    )
    .catch((err: { errorCode: number; errorMessage: string, errors:any }) => {
      if (err.errorCode === 910)
        cliux.error(`error : Branch with UID '${branch.uid}' already exists, please enter a unique branch UID`);
      else if (err.errorCode === 903){
        if(err.errors?.uid){
          cliux.error(`error : Branch UID must be 15 character(s) or less, please enter a valid branch UID`)
        }else{
          cliux.error(
            `error : Source Branch with UID '${branch.source}' does not exist, please enter correct source branch UID`,
          );
        }
      }
      else{
        let errorMsg: string;
        if(err.errors?.branches){
          const errorOutput = err.errors.branches[0];
          errorMsg = `${err.errorMessage} ${errorOutput}`;
        }else{
          errorMsg = err.errorMessage;
        }
        cliux.error(`error: ${errorMsg}`);
      } 
    });
}
