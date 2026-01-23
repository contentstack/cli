import configStore from './config-handler';

export interface ProxyConfig {
  protocol: 'http' | 'https';
  host: string;
  port: number;
  auth?: {
    username: string;
    password: string;
  };
}

/**
 * Get proxy configuration with priority: Environment variables > Global config
 * @returns ProxyConfig object or undefined if no proxy is configured
 */
export function getProxyConfig(): ProxyConfig | undefined {
  // Priority 1: Check environment variables (HTTPS_PROXY or HTTP_PROXY)
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  
  if (proxyUrl) {
    try {
      const url = new URL(proxyUrl);
      const defaultPort = url.protocol === 'https:' ? 443 : 80;
      const port = url.port ? Number.parseInt(url.port, 10) : defaultPort;
      
      if (!Number.isNaN(port) && port >= 1 && port <= 65535) {
        const protocol = url.protocol.replace(':', '') as 'http' | 'https';
        const proxyConfig: ProxyConfig = {
          protocol: protocol,
          host: url.hostname,
          port: port,
        };
        
        if (url.username || url.password) {
          proxyConfig.auth = {
            username: url.username,
            password: url.password,
          };
        }
        
        return proxyConfig;
      }
    } catch {
      // Invalid URL, continue to check global config
    }
  }
  
  // Priority 2: Check global config store
  const globalProxyConfig = configStore.get('proxy');
  if (globalProxyConfig) {
    if (typeof globalProxyConfig === 'object') {
      const port = globalProxyConfig.port;
      if (port !== undefined && !Number.isNaN(port) && port >= 1 && port <= 65535) {
        return globalProxyConfig as ProxyConfig;
      }
    } else if (typeof globalProxyConfig === 'string') {
      try {
        const url = new URL(globalProxyConfig);
        const defaultPort = url.protocol === 'https:' ? 443 : 80;
        const port = url.port ? Number.parseInt(url.port, 10) : defaultPort;
        
        if (!Number.isNaN(port) && port >= 1 && port <= 65535) {
          const protocol = url.protocol.replace(':', '') as 'http' | 'https';
          const proxyConfig: ProxyConfig = {
            protocol: protocol,
            host: url.hostname,
            port: port,
          };
          
          if (url.username || url.password) {
            proxyConfig.auth = {
              username: url.username,
              password: url.password,
            };
          }
          
          return proxyConfig;
        }
      } catch {
        // Invalid URL, return undefined
      }
    }
  }
  
  return undefined;
}

/**
 * Check if proxy is configured (from any source)
 * @returns true if proxy is configured, false otherwise
 */
export function hasProxy(): boolean {
  return !!getProxyConfig() || !!process.env.HTTPS_PROXY || !!process.env.HTTP_PROXY || !!configStore.get('proxy');
}

/**
 * Get proxy URL string for display purposes
 * @returns Proxy URL string or 'proxy server' if not available
 */
export function getProxyUrl(): string {
  const proxyConfig = getProxyConfig();
  if (proxyConfig) {
    return `${proxyConfig.protocol}://${proxyConfig.host}:${proxyConfig.port}`;
  }
  
  const envProxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (envProxy) {
    return envProxy;
  }
  
  const globalProxy = configStore.get('proxy');
  if (globalProxy && typeof globalProxy === 'object') {
    return `${globalProxy.protocol}://${globalProxy.host}:${globalProxy.port}`;
  }
  
  return 'proxy server';
}

