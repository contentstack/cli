import authHandler from './auth-handler';
export const isAuthenticated = () => authHandler.isAuthenticated();
export const doesBranchExist = async (stack, branchName) => {
    return stack
    .branch(branchName)
    .fetch()
    .catch(error => {
        return error
    })
}