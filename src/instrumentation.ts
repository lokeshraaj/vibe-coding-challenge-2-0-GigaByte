/**
 * Next.js Instrumentation Hook
 * Executes once on server startup before handling incoming requests.
 * Ensures Node.js DNS resolvers and network settings are verified for MongoDB Atlas SRV resolution.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initializeDns } = await import("@/lib/db/dns-init");
    await initializeDns();
  }
}
