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
 * Parse NO_PROXY / no_proxy env (both uppercase and lowercase).
 * NO_PROXY has priority over HTTP_PROXY/HTTPS_PROXY: hosts in this list never use the proxy.
 * Values are hostnames only, comma-separated; leading dot matches subdomains (e.g. .contentstack.io).
 * The bypass list is fully dynamic: only env values are used (no hardcoded default).
 * @returns List of trimmed entries, or empty array when NO_PROXY/no_proxy is unset
 */
export function getNoProxyList(): string[] {
  const raw = process.env.NO_PROXY || process.env.no_proxy || '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Normalize host for NO_PROXY matching: strip protocol/URL, port, lowercase, handle IPv6 brackets.
 * Accepts hostname, host:port, or full URL (e.g. https://api.contentstack.io).
 */
function normalizeHost(host: string): string {
  if (!host || typeof host !== 'string') return '';
  let h = host.trim().toLowerCase();
  // If it looks like a URL, extract hostname so NO_PROXY matching works (e.g. region.cma is full URL)
  if (h.includes('://')) {
    try {
      const u = new URL(h);
      h = u.hostname;
    } catch {
      // fall through to port stripping below
    }
  }
  const portIdx = h.lastIndexOf(':');
  if (h.startsWith('[')) {
    const close = h.indexOf(']');
    if (close !== -1 && h.length > close + 1 && h[close + 1] === ':') {
      h = h.slice(1, close);
    }
  } else if (portIdx !== -1) {
    const after = h.slice(portIdx + 1);
    if (/^\d+$/.test(after)) {
      h = h.slice(0, portIdx);
    }
  }
  return h;
}

/**
 * Check if the given host should bypass the proxy based on NO_PROXY / no_proxy.
 * Supports: exact host, leading-dot subdomain match (e.g. .contentstack.io), and wildcard *.
 * @param host - Request hostname (with or without port; will be normalized)
 * @returns true if proxy should not be used for this host
 */
export function shouldBypassProxy(host: string): boolean {
  const normalized = normalizeHost(host);
  if (!normalized) return false;

  const list = getNoProxyList();
  for (const entry of list) {
    const e = entry.trim().toLowerCase();
    if (!e) continue;
    if (e === '*') return true;
    if (e.startsWith('.')) {
      const domain = e.slice(1);
      if (normalized === domain || normalized.endsWith(e)) return true;
    } else {
      if (normalized === e) return true;
    }
  }
  return false;
}

/**
 * Get proxy configuration. Sources (in order): env (HTTP_PROXY/HTTPS_PROXY), then global config
 * from `csdx config:set:proxy --host --port --protocol `.
 * For per-request use, prefer getProxyConfigForHost(host) so NO_PROXY overrides both sources.
 * @returns ProxyConfig object or undefined if no proxy is configured
 */
export function getProxyConfig(): ProxyConfig | undefined {
  // Priority 1: Environment variables (HTTPS_PROXY or HTTP_PROXY)
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
  
  // Priority 2: Global config (csdx config:set:proxy)
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
 * Get proxy config only when the request host is not in NO_PROXY.
 * NO_PROXY has priority over both HTTP_PROXY/HTTPS_PROXY and over proxy set via
 * `csdx config:set:proxy` — if the host matches NO_PROXY, no proxy is used.
 * Use this for all outbound requests so Contentstack and localhost bypass the proxy when set.
 * @param host - Request hostname (e.g. api.contentstack.io or full URL like https://api.contentstack.io)
 * @returns ProxyConfig or undefined if proxy is disabled or host should bypass (NO_PROXY)
 */
export function getProxyConfigForHost(host: string): ProxyConfig | undefined {
  if (shouldBypassProxy(host)) return undefined;
  return getProxyConfig();
}

/**
 * Resolve request host for proxy/NO_PROXY checks: config.host or default CMA from region.
 * Use when the caller may omit host so NO_PROXY still applies (e.g. from region.cma).
 * @param config - Object with optional host (e.g. API client config)
 * @returns Host string (hostname or empty)
 */
export function resolveRequestHost(config: { host?: string }): string {
  if (config.host) return config.host;
  const cma = configStore.get('region')?.cma;
  if (cma && typeof cma === 'string') {
    if (cma.startsWith('http')) {
      try {
        const u = new URL(cma);
        return u.hostname || cma;
      } catch {
        return cma;
      }
    }
    return cma;
  }
  return '';
}

/**
 * Temporarily clear proxy-related env vars so SDK/axios cannot use them.
 * Call the returned function to restore. Use when creating a client for a host in NO_PROXY.
 * @returns Restore function (call to put env back)
 */
export function clearProxyEnv(): () => void {
  const saved: Record<string, string | undefined> = {};
  const keys = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY', 'all_proxy'];
  for (const k of keys) {
    if (k in process.env) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  }
  return () => {
    for (const k of keys) {
      if (saved[k] !== undefined) process.env[k] = saved[k];
    }
  };
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

