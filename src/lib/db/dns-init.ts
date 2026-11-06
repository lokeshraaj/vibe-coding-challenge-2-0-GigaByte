import dns from "node:dns";

/**
 * Global Node.js DNS Configuration for MongoDB Atlas SRV Resolution
 *
 * 1. Node.js uses c-ares for SRV and TXT queries (bypassing Windows getaddrinfo).
 *    On Windows networks (especially mobile hotspots / USB tethering / virtual NICs),
 *    c-ares fails to discover nameservers from the registry and defaults to ['127.0.0.1'].
 *    Since localhost does not run a DNS daemon on port 53, queries immediately fail
 *    with `querySrv ECONNREFUSED`.
 * 2. Setting Google Public DNS ('8.8.8.8' and '8.8.4.4') enables reliable SRV resolution.
 * 3. Setting `ipv4first` prevents synthesized NAT64 addresses from interfering with IPv4 direct endpoints.
 */

export const VERIFIED_DNS_SERVERS: readonly [string, string] = ["8.8.8.8", "8.8.4.4"] as const;

declare global {
  // eslint-disable-next-line no-var
  var __athlix_dns_initialized: boolean | undefined;
}

/**
 * Determines whether the active DNS configuration requires override.
 * Returns true if no servers are configured or if only loopback/localhost servers exist.
 */
export function needsDnsConfiguration(): boolean {
  if (typeof dns.getServers !== "function") return false;
  try {
    const servers = dns.getServers();
    if (!servers || servers.length === 0) return true;
    return servers.every(
      (s) => s === "127.0.0.1" || s === "::1" || s.startsWith("127.") || s === "localhost"
    );
  } catch {
    return false;
  }
}

/**
 * Applies verified public DNS servers to both the callback and promises DNS interfaces.
 */
export function applyDnsConfiguration(): boolean {
  if (typeof window !== "undefined") return false;

  try {
    if (typeof dns.setDefaultResultOrder === "function") {
      dns.setDefaultResultOrder("ipv4first");
    }
    if (typeof dns.setServers === "function") {
      dns.setServers([...VERIFIED_DNS_SERVERS]);
    }
    if (dns.promises && typeof dns.promises.setServers === "function") {
      dns.promises.setServers([...VERIFIED_DNS_SERVERS]);
    }
    globalThis.__athlix_dns_initialized = true;
    return true;
  } catch (err) {
    console.warn("[DNS Init] Could not configure process DNS resolvers:", err);
    return false;
  }
}

/**
 * Standalone probe helper for diagnostic scripts or manual network validation.
 */
export async function probeDnsServers(
  servers: string[],
  testRecord = "_mongodb._tcp.cluster0.xmsz27w.mongodb.net",
  timeoutMs = 1200
): Promise<boolean> {
  const { Resolver } = dns.promises;
  const probeResolver = new Resolver();

  const probePromise = (async () => {
    try {
      probeResolver.setServers(servers);
      await probeResolver.resolveSrv(testRecord);
      return true;
    } catch {
      try {
        await probeResolver.resolve4("google.com");
        return true;
      } catch {
        return false;
      }
    }
  })();

  const timeoutPromise = new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      try {
        probeResolver.cancel();
      } catch {
        // ignore
      }
      resolve(false);
    }, timeoutMs);

    if (typeof timer.unref === "function") {
      timer.unref();
    }
  });

  return Promise.race([probePromise, timeoutPromise]);
}

/**
 * Initializes and locks verified DNS resolvers for the Node.js process.
 * Configures resolvers when loopback defaults are detected or when explicitly forced.
 */
export async function initializeDns(
  force = false
): Promise<{ success: boolean; servers: string[] }> {
  if (typeof window !== "undefined") {
    return { success: false, servers: [] };
  }

  if (!force && globalThis.__athlix_dns_initialized && !needsDnsConfiguration()) {
    return {
      success: true,
      servers: dns.getServers ? dns.getServers() : [...VERIFIED_DNS_SERVERS],
    };
  }

  const success = applyDnsConfiguration();
  return {
    success,
    servers: dns.getServers ? dns.getServers() : [...VERIFIED_DNS_SERVERS],
  };
}

// Synchronous fast-path: Executes immediately when dns-init is loaded.
if (typeof window === "undefined" && (!globalThis.__athlix_dns_initialized || needsDnsConfiguration())) {
  applyDnsConfiguration();
}
