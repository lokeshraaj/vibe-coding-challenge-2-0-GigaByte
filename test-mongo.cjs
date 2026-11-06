const fs = require("fs");
const dns = require("node:dns");
const mongoose = require("mongoose");

async function main() {
    try {
        const env = fs.readFileSync(".env.local", "utf8");

        const line = env
            .split(/\r?\n/)
            .find(x => x.trim().startsWith("MONGODB_URI="));

        if (!line) {
            throw new Error("MONGODB_URI not found");
        }

        let uri = line.slice(line.indexOf("=") + 1).trim();

        if (uri.startsWith('"') && uri.endsWith('"')) {
            uri = uri.slice(1, -1);
        }

        if (uri.startsWith("'") && uri.endsWith("'")) {
            uri = uri.slice(1, -1);
        }

        dns.setServers(["8.8.8.8", "8.8.4.4"]);

        console.log("Testing DNS...");

        const records = await dns.promises.resolveSrv(
            "_mongodb._tcp.cluster0.xmsz27w.mongodb.net"
        );

        console.log("SRV DNS SUCCESS:", records.length, "records found");

        console.log("Testing MongoDB connection...");

        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 15000
        });

        console.log("MONGODB CONNECTION SUCCESS");

        await mongoose.disconnect();

    } catch (error) {
        console.error("TEST FAILED:", error.name);
        console.error("Reason:", error.message);

        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect().catch(() => {});
        }

        process.exitCode = 1;
    }
}

main();
