import { cliux as ux, authHandler, configHandler, formatError } from './index';

class AuthenticationHandler {
  private authType: string;
  private isOAuth: boolean;
  private token: string | null = null;

  constructor() {
    this.authType = configHandler.get('authorisationType');
    this.isOAuth = this.authType === 'OAUTH';
  }

  async getAuthDetails(): Promise<void> {
    try {
      switch (this.authType) {
        case 'BASIC':
          this.token = configHandler.get('authtoken');
          break;
        case 'OAUTH':
          await authHandler.compareOAuthExpiry();
          this.token = `Bearer ${configHandler.get('oauthAccessToken')}`;
          break;
        default:
          const authToken = configHandler.get('authtoken');
          if (authToken) {
            this.token = authToken;
          } else {
            ux.print('Session timed out, please login to proceed', {
              color: 'yellow',
            });
            throw new Error('Session timed out, please login to proceed');
          }
          break;
      }
    } catch (error) {
      const formattedError = formatError(error);
      ux.print(`Error occurred while fetching auth details: ${formattedError}`, {
        color: 'red',
      });
      throw error;
    }
  }

  get isOauthEnabled(): boolean {
    return this.isOAuth;
  }

  get accessToken(): string {
    if (!this.token) {
      throw new Error('Token is not available. Please authenticate first.');
    }
    return this.token;
  }

  async refreshAccessToken(error: any, maxRetryCount = 1): Promise<void> {
    if (error.response && error.response.status) {
      switch (error.response.status) {
        case 401:
          // NOTE: Refresh the token if the type is OAuth.
          const region: { cma: string; name: string; cda: string } = configHandler.get('region') || {};
          if (region?.cma) {
            let hostName: string = '';
            if (region.cma.startsWith('http')) {
              const u = new URL(region.cma);
              if (u.host) hostName = u.host;
            }
            hostName = hostName || region.cma;
            const refreshed = await this.refreshToken(hostName);
            if (refreshed) {
              return this.refreshAccessToken(error, maxRetryCount); // Retry after refreshing the token
            }

            const errorDetails = formatError(error);
            ux.print(`Authentication failed: ${errorDetails}`, { color: 'red' });
            // For Basic Auth, exit immediately without retrying
            return;
          }
          break;

        case 429:
        case 408:
          if (maxRetryCount >= 3) {
            const errorDetails = formatError(error);
            const statusText = error?.response?.status === 429 ? 'Rate Limited' : 'Request Timeout';
            ux.print(`Max retry attempts exceeded (${maxRetryCount}/3)`, { color: 'red' });
            ux.print(`Status: ${error?.response?.status} - ${statusText}`, { color: 'yellow' });
            ux.print(`Error: ${errorDetails}`, { color: 'white' });
            return;
          }
          maxRetryCount++; // Increment for the next retry attempt
          // These cases require a wait, adding a delay before retrying
          await new Promise((resolve) => setTimeout(resolve, 1000)); // wait for 1 second
          return this.refreshAccessToken(error, maxRetryCount); // Retry

        default:
          return; // Handle other cases if necessary
      }
    }
  }

  refreshToken(hostName: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      if (this.authType === 'BASIC') {
        ux.print('Session timed out, please login to proceed', {
          color: 'yellow',
        });
        ux.print('\nTo fix this:', { color: 'cyan' });
        ux.print('• Run: "csdx auth:login"', { color: 'white' });
        resolve(false);
      } else if (this.authType === 'OAUTH') {
        authHandler.host = hostName;
        // NOTE Handle OAuth refresh token
        authHandler
          .compareOAuthExpiry(true)
          .then(() => {
            this.token = `Bearer ${configHandler.get('oauthAccessToken')}`;
            resolve(true);
          })
          .catch((error: any) => {
            const errorDetails = formatError(error);
            ux.print('OAuth Token Refresh Failed', { color: 'red' });
            ux.print(`Error: ${errorDetails}`, { color: 'white' });
            resolve(false);
          });
      } else {
        ux.print('You do not have the permissions to perform this action, please login to proceed', {
          color: 'yellow',
        });
        resolve(false);
      }
    });
  }
}

const authenticationHandler = new AuthenticationHandler();
export default authenticationHandler;
