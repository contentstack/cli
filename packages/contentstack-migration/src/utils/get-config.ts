import { apiConfig } from '../config';

export default ({ method, path, sdkAction }: { method: string; path?: string; sdkAction?: string }): any => {
  const config: any = {
    ...apiConfig,
    path: path ? `${apiConfig.version}${path}` : apiConfig.version,
    method,
    headers: { ...apiConfig.headers },
  };
  if (sdkAction !== undefined) {
    config.sdkAction = sdkAction;
  }
  return config;
};
