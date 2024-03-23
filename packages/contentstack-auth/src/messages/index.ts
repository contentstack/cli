const messages = {
  CLI_AUTH_LOGIN_ASK_CHANNEL_FOR_OTP: 'Please select OTP channel',
  CLI_AUTH_LOGIN_ENTER_EMAIL_ADDRESS: 'Enter your email address',
  CLI_AUTH_LOGIN_ENTER_PASSWORD: 'Enter your password',
  CLI_AUTH_LOGIN_SUCCESS: 'Successfully logged in!!',
  CLI_AUTH_LOGIN_FAILED: 'Login Error',
  CLI_AUTH_AUTHENTICATION_FAILED: 'You need to login first. See: auth:login --help',
  CLI_AUTH_LOGIN_DESCRIPTION: 'User session login',
  CLI_AUTH_LOGIN_FLAG_USERNAME: 'User name',
  CLI_AUTH_LOGIN_FLAG_PASSWORD: 'Password',
  CLI_AUTH_LOGIN_SECURITY_CODE_SEND_SUCCESS: 'Security code sent to your mobile',
  CLI_AUTH_LOGIN_ASK_CHANNEL_FOR_SECURITY_CODE:
    'Two factor authentication enabled, please select a way to get the security code',
  CLI_AUTH_LOGIN_ENTER_SECURITY_CODE: 'Please provide the security code',
  CLI_AUTH_LOGOUT_CONFIRM: 'Are you sure you want to log out?',
  CLI_AUTH_LOGOUT_LOADER_START: 'Logging out....',
  CLI_AUTH_LOGOUT_SUCCESS: 'Successfully logged out',
  CLI_AUTH_LOGOUT_FAILED: 'Error in logout, please login again',
  CLI_AUTH_LOGOUT_DESCRIPTION: 'User session logout',
  CLI_AUTH_LOGOUT_FLAG_FORCE: 'Force logging out for skipping the confirmation',
  CLI_AUTH_LOGOUT_ALREADY: "You're already logged out",
  CLI_AUTH_WHOAMI_LOGGED_IN_AS: 'You are currently logged in with email',
  CLI_AUTH_WHOAMI_FAILED: 'Failed to get the current user details',
  CLI_AUTH_WHOAMI_DESCRIPTION: 'Display current users email address',
  CLI_AUTH_TOKENS_ADD_ASK_TOKEN_ALIAS: 'Provide alias to store token',
  CLI_AUTH_TOKENS_ADD_CONFIRM_ALIAS_REPLACE: 'Alias is already exists, do you want to replace?',
  CLI_AUTH_TOKENS_ADD_ENTER_API_KEY: 'Enter the api key',
  CLI_AUTH_TOKENS_ADD_ENTER_TOKEN: 'Enter the token',
  CLI_AUTH_TOKENS_ADD_ENTER_ENVIRONMENT: 'Enter the environment name',
  CLI_AUTH_TOKENS_ADD_REPLACE_SUCCESS: 'Successfully replaced the token',
  CLI_AUTH_TOKENS_ADD_SUCCESS: 'Successfully added the token',
  CLI_AUTH_TOKENS_ADD_FAILED: 'Failed to add the token',
  CLI_AUTH_TOKENS_ADD_DESCRIPTION:
    'Adds management/delivery tokens to your session to use it with further CLI command by default it adds management token if either of management or delivery flags are not set',
  CLI_AUTH_TOKENS_ADD_FLAG_DELIVERY_TOKEN: 'Set this while saving delivery token',
  CLI_AUTH_TOKENS_ADD_FLAG_MANAGEMENT_TOKEN: 'Set this while saving management token',
  CLI_AUTH_TOKENS_ADD_FLAG_ENVIRONMENT_NAME: 'Environment name for delivery token',
  CLI_AUTH_TOKENS_REMOVE_SUCCESS: 'Token removed successfully !!',
  CLI_AUTH_TOKENS_REMOVE_FAILED: 'Failed to remove the selected token',
  CLI_AUTH_TOKENS_NOT_FOUND: 'No tokens are added yet!',
  CLI_AUTH_TOKENS_REMOVE_SELECT_TOKEN: 'Select tokens to remove',
  CLI_AUTH_TOKENS_REMOVE_DESCRIPTION: 'Removes selected tokens',
  CLI_AUTH_TOKENS_LIST_NO_TOKENS: 'No tokens are added. Use auth:tokens:add command to add tokens.',
  CLI_AUTH_TOKENS_LIST_FAILED: 'Failed to list the tokens',
  CLI_AUTH_TOKENS_LIST_DESCRIPTION: 'Lists all existing tokens added to the session',
  CLI_AUTH_TOKENS_VALIDATION_INVALID_DELIVERY_TOKEN: 'Invalid delivery token',
  CLI_AUTH_TOKENS_VALIDATION_INVALID_ENVIRONMENT_NAME: 'Invalid environment name',
  CLI_AUTH_TOKENS_VALIDATION_INVALID_MANAGEMENT_TOKEN: 'Invalid management token',
  CLI_AUTH_TOKENS_VALIDATION_INVALID_API_KEY: 'Invalid api key',
  CLI_AUTH_EXIT_PROCESS: 'Exiting the process...',
  CLI_SELECT_TOKEN_TYPE: 'Select the type of token to add',
  CLI_AUTH_ENTER_BRANCH: 'Enter branch name',
};

export { messages };
