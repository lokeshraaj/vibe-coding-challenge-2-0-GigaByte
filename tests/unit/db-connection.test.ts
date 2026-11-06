import { describe, it, expect, vi } from "vitest";
import { sanitizeMongoUri } from "@/lib/db/mongodb";
import { DatabaseConnectionError, isDatabaseError, handleApiError } from "@/lib/errors";
import { initializeDns, probeDnsServers } from "@/lib/db/dns-init";
import dns from "node:dns";

describe("MongoDB Connection and DNS Tests", () => {
  describe("sanitizeMongoUri", () => {
    it("masks credentials in mongodb+srv connection string", () => {
      const uri = "mongodb+srv://admin_user:SuperSecret123@cluster0.qckykir.mongodb.net/athlix_dev";
      const sanitized = sanitizeMongoUri(uri);
      expect(sanitized).toBe("mongodb+srv://admin_user:****@cluster0.qckykir.mongodb.net/athlix_dev");
      expect(sanitized).not.toContain("SuperSecret123");
    });

    it("masks credentials in standard mongodb connection string with multiple hosts", () => {
      const uri = "mongodb://user1:myPassword@host1:27017,host2:27017/athlix_dev?replicaSet=rs0";
      const sanitized = sanitizeMongoUri(uri);
      expect(sanitized).toBe("mongodb://user1:****@host1:27017,host2:27017/athlix_dev?replicaSet=rs0");
      expect(sanitized).not.toContain("myPassword");
    });

    it("returns plain URI if no credentials are present", () => {
      const uri = "mongodb://127.0.0.1:27017/athlix_dev";
      expect(sanitizeMongoUri(uri)).toBe("mongodb://127.0.0.1:27017/athlix_dev");
    });
  });

  describe("isDatabaseError and handleApiError", () => {
    it("identifies DatabaseConnectionError and returns 503", () => {
      const err = new DatabaseConnectionError("Database is down");
      expect(isDatabaseError(err)).toBe(true);

      const response = handleApiError(err);
      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("Database is down");
    });

    it("identifies querySrv DNS error and returns 503", () => {
      const err = new Error("querySrv ECONNREFUSED _mongodb._tcp.cluster0.qckykir.mongodb.net");
      expect(isDatabaseError(err)).toBe(true);

      const response = handleApiError(err);
      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Database service temporarily unavailable. Please try again shortly.");
    });

    it("identifies MongooseServerSelectionError and returns 503", () => {
      const err = {
        name: "MongooseServerSelectionError",
        message: "Could not connect to any servers in your MongoDB Atlas cluster.",
      };
      expect(isDatabaseError(err)).toBe(true);

      const response = handleApiError(err);
      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Database service temporarily unavailable. Please try again shortly.");
    });

    it("identifies SSL alert number 80 error as database error", () => {
      const err = new Error("SSL routines:ssl3_read_bytes:tlsv1 alert internal error:SSL alert number 80");
      expect(isDatabaseError(err)).toBe(true);

      const response = handleApiError(err);
      expect(response.status).toBe(503);
    });

    it("does not treat unrelated errors as database errors", () => {
      const err = new Error("Some business logic calculation failed");
      expect(isDatabaseError(err)).toBe(false);

      const response = handleApiError(err);
      expect(response.status).toBe(500);
    });
  });

  describe("DNS Resolver Probing and Initialization", () => {
    it("handles probe timeout gracefully when offline without throwing unhandled exceptions", async () => {
      // Test probe timeout with unreachable address and short timeout (50ms)
      const works = await probeDnsServers(["192.0.2.1"], undefined, 50);
      expect(works).toBe(false);
    });

    it("successfully completes initializeDns without throwing", async () => {
      const result = await initializeDns();
      expect(result).toHaveProperty("servers");
      expect(Array.isArray(result.servers)).toBe(true);
      expect(result.servers).toEqual(["8.8.8.8", "8.8.4.4"]);

      const currentServers = dns.getServers();
      expect(currentServers).toEqual(["8.8.8.8", "8.8.4.4"]);
    });
  });
});
