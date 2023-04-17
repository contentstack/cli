import configHandler from "./config-handler";
export function isAuthenticated() {
    if (configHandler.get('authtoken')) {
        return true;
    } else {
        return false;
    }
}