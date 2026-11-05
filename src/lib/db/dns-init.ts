import dns from "node:dns";

/**
 * Global Node.js DNS Configuration for MongoDB Atlas SRV Resolution
 *
 * 1. Node.js uses c-ares for SRV and TXT queries (bypassing Windows getaddrinfo).
 *    On Windows networks with local router/adapter DNS, SRV queries often fail
 *    with `querySrv ECONNREFUSED`. Setting Google and Cloudflare DNS resolves this.
 * 2. On dual-stack / mobile hotspot / NAT64 networks, Node.js defaults to IPv6,
 *    causing synthesized NAT64 addresses to fail the MongoDB Atlas TLS handshake
 *    with `tlsv1 alert internal error (SSL alert number 80)`.
 *    Setting `ipv4first` ensures direct connection to Atlas's whitelisted IPv4 endpoints.
 */
if (typeof window === "undefined") {
  try {
    if (typeof dns.setServers === "function") {
      dns.setServers(["8.8.8.8", "1.1.1.1"]);
    }
    if (typeof dns.setDefaultResultOrder === "function") {
      dns.setDefaultResultOrder("ipv4first");
    }
  } catch (err) {
    console.warn("[DNS Init] Could not configure process DNS resolvers:", err);
  }
}
