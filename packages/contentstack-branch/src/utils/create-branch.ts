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
    .catch((err: { errorCode: number; errorMessage: string }) => {
      if (err.errorCode === 910)
        cliux.error(`Error : Branch with uid ${branch.uid} already exists, please enter unique branch uid`);
      else if (err.errorCode === 903)
        cliux.error(
          `Error : Source Branch with uid ${branch.source} does not exist, please enter correct source branch uid`,
        );
      else cliux.error(err.errorMessage);
    });
}
