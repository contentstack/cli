import { cliux } from '@contentstack/cli-utilities';
import ContentstackClient from '../seed/contentstack/client';

export const COMPASS_REPO = 'compass-starter-stack';
export const ENGLISH_LOCALE = 'en-us';

const compassScopes = {
    "name":"This is a compass app management token",
    "description":"This is a compass app management token.",
    "scope":[
        {
            "module":"content_type",
            "acl":{
                "read":true,
                "write":true
            }
        },
        {
            "module":"branch",
            "branches":[
                "main"
            ],
            "acl":{
                "read":true
            }
        }
    ],
    "expires_on": "3000-01-01",
    "is_email_notification_enabled":false
};

interface CompassCheckParams {
  csClient: ContentstackClient;
  api_key: string;
  managementToken?: string;
  masterLocale?: string;
}

export async function shouldProceedForCompassApp({
  csClient,
  api_key,
  managementToken,
  masterLocale,
}: CompassCheckParams): Promise<boolean> {
  const stackDetails = await csClient.getStack(api_key);

  if (!stackDetails) {
    cliux.error('Failed to fetch stack details.');
    return false;
  }

  if (masterLocale !== stackDetails.master_locale) {
    cliux.print(
      `Compass app requires the master locale to be set to English (en-us).`,
      {
        color: 'yellow',
        bold: true,
      },
    );
    return false;
  }

  const result = await csClient.createManagementToken(api_key, managementToken, compassScopes);

  if (result?.response_code === '161' || result?.response_code === '401') {
    cliux.print(
      `Info: Failed to generate a management token.\nNote: Management token is not available in your plan. Please contact the admin for support.`,
      {
        color: 'red',
      },
    );
    return false;
  }

  return true;
}
