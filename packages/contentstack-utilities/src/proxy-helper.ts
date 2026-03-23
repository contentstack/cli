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

let noProxyEnvSnapshot = '';
let noProxyListCache: string[] = [];

/**
 * Parse NO_PROXY / no_proxy env (both uppercase and lowercase).
 * List is cached until the env value changes (avoids split/trim on every request).
 */
export function getNoProxyList(): string[] {
  const raw = process.env.NO_PROXY || process.env.no_proxy || '';
  if (raw === noProxyEnvSnapshot) {
    return noProxyListCache;
  }
  noProxyEnvSnapshot = raw;
  noProxyListCache = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return noProxyListCache;
}

function normalizeHost(host: string): string {
  if (!host || typeof host !== 'string') return '';
  let h = host.trim().toLowerCase();
  if (h.includes('://')) {
    try {
      const u = new URL(h);
      h = u.hostname;
    } catch {
      // fall through
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
 */
export function shouldBypassProxy(host: string): boolean {
  const normalized = normalizeHost(host);
  if (!normalized) return false;

  const list = getNoProxyList();
  for (const e of list) {
    if (e === '*') return true;
    if (e.startsWith('.')) {
      const domain = e.slice(1);
      if (normalized === domain || normalized.endsWith(e)) return true;
    } else if (normalized === e) {
      return true;
    }
  }
  return false;
}

function proxyConfigFromUrlString(proxyUrl: string): ProxyConfig | undefined {
  try {
    const url = new URL(proxyUrl);
    const defaultPort = url.protocol === 'https:' ? 443 : 80;
    const port = url.port ? Number.parseInt(url.port, 10) : defaultPort;

    if (Number.isNaN(port) || port < 1 || port > 65535) {
      return undefined;
    }

    const protocol = url.protocol.replace(':', '') as 'http' | 'https';
    const proxyConfig: ProxyConfig = {
      protocol,
      host: url.hostname,
      port,
    };

    if (url.username || url.password) {
      proxyConfig.auth = {
        username: url.username,
        password: url.password,
      };
    }

    return proxyConfig;
  } catch {
    return undefined;
  }
}

function proxyFromGlobalStore(): ProxyConfig | undefined {
  const globalProxyConfig = configStore.get('proxy');
  if (!globalProxyConfig) {
    return undefined;
  }
  if (typeof globalProxyConfig === 'object') {
    const port = globalProxyConfig.port;
    if (port !== undefined && !Number.isNaN(port) && port >= 1 && port <= 65535) {
      return globalProxyConfig as ProxyConfig;
    }
    return undefined;
  }
  if (typeof globalProxyConfig === 'string') {
    return proxyConfigFromUrlString(globalProxyConfig);
  }
  return undefined;
}

/**
 * Global CLI proxy first, then HTTP_PROXY / HTTPS_PROXY.
 * Use getProxyConfigForHost(host) so NO_PROXY is applied per request.
 */
export function getProxyConfig(): ProxyConfig | undefined {
  const fromGlobal = proxyFromGlobalStore();
  if (fromGlobal) {
    return fromGlobal;
  }

  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (proxyUrl) {
    return proxyConfigFromUrlString(proxyUrl);
  }

  return undefined;
}

export function getProxyConfigForHost(host: string): ProxyConfig | undefined {
  if (shouldBypassProxy(host)) return undefined;
  return getProxyConfig();
}

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

export function hasProxy(): boolean {
  return (
    !!getProxyConfig() ||
    !!process.env.HTTPS_PROXY ||
    !!process.env.HTTP_PROXY ||
    !!configStore.get('proxy')
  );
}

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
