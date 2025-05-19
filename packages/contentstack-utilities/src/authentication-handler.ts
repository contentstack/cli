import { cliux as ux, authHandler, configHandler } from './index';

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
            process.exit(1);
          }
          break;
      }
    } catch (error) {
      ux.print(`Error occurred while fetching auth details: ${error.message}`, {
        color: 'red',
      });
      process.exit(1);
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
    console.log('🚀 ~ Refresh attempt:', maxRetryCount);
    console.log('🚀 ~ Error status:', error.response?.status);
    console.log('🚀 ~ Error details:', error.response?.data);
    if (error.response && error.response.status) {
      if (maxRetryCount >= 3) {
        ux.print('Max retry count reached, please login to proceed', {
          color: 'yellow',
        });
        process.exit(1);
      }

      maxRetryCount++; // Increment for the next retry attempt

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
            console.log('🚀 ~ Region config:', configHandler.get('region'));
            console.log('🚀 ~ Current OAuth token:', configHandler.get('oauthAccessToken'));
            await this.refreshToken(hostName);
            return this.refreshAccessToken(error, maxRetryCount); // Retry after refreshing the token
          }

        case 429:
        case 408:
          // These cases require a wait, adding a delay before retrying
          await new Promise((resolve) => setTimeout(resolve, 1000)); // wait for 1 second
          return this.refreshAccessToken(error, maxRetryCount); // Retry

        default:
          return; // Handle other cases if necessary
      }
    }
  }

  refreshToken(hostName: string): Promise<boolean> {
    console.log('🚀 ~ Attempting to refresh token for host:', hostName);
    console.log('🚀 ~ Auth type:', this.authType);

    return new Promise<boolean>((resolve) => {
      if (this.authType === 'BASIC') {
        // NOTE Handle basic auth 401 here
        resolve(false);
        ux.print('Session timed out, please login to proceed', {
          color: 'yellow',
        });
        process.exit();
      } else if (this.authType === 'OAUTH') {
        console.log('🚀 ~ Starting OAuth refresh...');
        authHandler.host = hostName;
        // NOTE Handle OAuth refresh token
        authHandler
          .compareOAuthExpiry(true)
          .then(() => {
            console.log('🚀 ~ Token refreshed successfully');
            this.token = `Bearer ${configHandler.get('oauthAccessToken')}`;
            resolve(true);
          })
          .catch((error: any) => {
            console.log('🚀 ~ Token refresh failed:', error);
            resolve(false);
          });
      } else {
        resolve(false);
        ux.print('You do not have the permissions to perform this action, please login to proceed', {
          color: 'yellow',
        });
        process.exit();
      }
    });
  }
}

const authenticationHandler = new AuthenticationHandler();
export default authenticationHandler;
