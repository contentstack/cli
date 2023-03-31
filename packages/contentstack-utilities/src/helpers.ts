import configHandler from "./config-handler";
export function isAuthenticated() {
    const authtoken = configHandler.get('authtoken');
    if (authtoken) {
        return true;
    } else {
        return false;
    }
}