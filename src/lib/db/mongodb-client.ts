import { connectToDatabase } from "./mongodb";
import { MongoClient } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

/**
 * Obtains the underlying MongoClient instance from the unified Mongoose connection.
 * Avoids running dual independent database connection pools and ensures shared DNS configuration,
 * retry logic, and singleton lifecycle management.
 */
function getMongoClientPromise(): Promise<MongoClient> {
  if (process.env.NODE_ENV === "development" && global._mongoClientPromise) {
    return global._mongoClientPromise;
  }

  const promise = connectToDatabase()
    .then((mongooseInstance) => {
      return mongooseInstance.connection.getClient() as unknown as MongoClient;
    })
    .catch((err) => {
      if (process.env.NODE_ENV === "development") {
        global._mongoClientPromise = undefined;
      }
      throw err;
    });

  if (process.env.NODE_ENV === "development") {
    global._mongoClientPromise = promise;
  }

  return promise;
}

// Proxied Promise implementation to preserve singleton caching without unhandled rejections at module load time
const clientPromise: Promise<MongoClient> = {
  then<TResult1 = MongoClient, TResult2 = never>(
    onfulfilled?: ((value: MongoClient) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return getMongoClientPromise().then(onfulfilled, onrejected);
  },
  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
  ): Promise<MongoClient | TResult> {
    return getMongoClientPromise().catch(onrejected);
  },
  finally(onfinally?: (() => void) | null): Promise<MongoClient> {
    return getMongoClientPromise().finally(onfinally);
  },
  [Symbol.toStringTag]: "Promise",
} as unknown as Promise<MongoClient>;

export default clientPromise;
