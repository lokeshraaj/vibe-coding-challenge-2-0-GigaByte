import { initializeDns } from "./dns-init";
import mongoose from "mongoose";
import dns from "node:dns";
import { DatabaseConnectionError } from "@/lib/errors";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/athlix_dev";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache || {
  conn: null,
  promise: null,
};

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

/**
 * Sanitizes MongoDB connection URIs to avoid exposing passwords in diagnostic logs.
 */
export function sanitizeMongoUri(uri: string): string {
  try {
    return uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@");
  } catch {
    return "[REDACTED_URI]";
  }
}

/**
 * Produces clear diagnostic context for MongoDB Atlas connection failures.
 */
function analyzeConnectionError(err: any): { diagnostic: string; isDnsFailure: boolean } {
  const errMsg = err?.message || String(err || "");
  const syscall = err?.syscall || "";
  const originalError = err?.cause || err?.reason;

  // Check if error is specifically an SRV DNS query failure
  const isDnsSrvFailure =
    syscall === "querySrv" ||
    errMsg.includes("querySrv") ||
    (originalError &&
      (originalError.syscall === "querySrv" ||
        String(originalError.message || "").includes("querySrv")));

  if (isDnsSrvFailure) {
    const activeServers = dns.getServers ? dns.getServers() : [];
    return {
      diagnostic: `DNS SRV resolution failed for MongoDB Atlas cluster (Node.js c-ares DNS resolver failed to resolve SRV records). Active Node DNS servers: ${JSON.stringify(activeServers)}. Verified public DNS resolvers (8.8.8.8, 8.8.4.4) or standard mongodb:// replicaSet connection string should be used.`,
      isDnsFailure: true,
    };
  }

  // Check for TLS alert 80 or SSL rejection (classic symptom of IP whitelist rejection in Atlas)
  const serverErrors =
    originalError?.servers instanceof Map
      ? Array.from(originalError.servers.values())
          .map((s: any) => String(s?.error?.message || ""))
          .join(" ")
      : "";

  const isSslAlert =
    errMsg.includes("SSL alert number 80") ||
    errMsg.includes("tlsv1 alert internal error") ||
    serverErrors.includes("SSL alert number 80") ||
    serverErrors.includes("tlsv1 alert internal error") ||
    (originalError && String(originalError).includes("SSL alert number 80"));

  if (isSslAlert) {
    return {
      diagnostic:
        "MongoDB Atlas rejected the TLS connection (SSL alert number 80). Your current client IP address is not whitelisted in MongoDB Atlas Network Access. Please add your current IP address to the IP Access List in the MongoDB Atlas dashboard (Security -> Network Access).",
      isDnsFailure: false,
    };
  }

  if (
    err?.name === "MongooseServerSelectionError" ||
    errMsg.includes("Could not connect to any servers in your MongoDB Atlas cluster")
  ) {
    return {
      diagnostic:
        "Could not connect to any servers in your MongoDB Atlas cluster. Please verify that your current client IP address is whitelisted in MongoDB Atlas Network Access (Security -> Network Access).",
      isDnsFailure: false,
    };
  }

  return {
    diagnostic:
      "Database connection failed. Please verify MongoDB server availability and network access.",
    isDnsFailure: false,
  };
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  // Return cached live connection if already established
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // Ensure Node.js DNS resolvers are verified before connecting
  await initializeDns();

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      dbName: process.env.MONGODB_DB || "athlix_dev",
    };

    const attemptConnect = async (): Promise<typeof mongoose> => {
      try {
        return await mongoose.connect(MONGODB_URI, opts);
      } catch (err: any) {
        const { isDnsFailure } = analyzeConnectionError(err);
        // Automatic recovery: If c-ares fails an SRV lookup (e.g. Windows socket glitch),
        // force-refresh DNS resolvers and retry once.
        if (isDnsFailure) {
          console.warn("[MongoDB] Initial SRV query failed. Re-applying verified DNS resolvers and retrying...");
          await initializeDns(true);
          return await mongoose.connect(MONGODB_URI, opts);
        }
        throw err;
      }
    };

    cached.promise = attemptConnect()
      .then((m) => {
        return m;
      })
      .catch((err) => {
        cached.promise = null;
        cached.conn = null;

        const { diagnostic } = analyzeConnectionError(err);
        const targetHost = sanitizeMongoUri(MONGODB_URI);
        console.error(`[MongoDB Connection Error] ${diagnostic} (Target: ${targetHost})`);

        throw new DatabaseConnectionError(
          `Database connection error: ${diagnostic}`,
          { originalError: err?.name || "ConnectionError" }
        );
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (e) {
    cached.promise = null;
    cached.conn = null;
    throw e;
  }
}
