import { Server } from "http";
import app from "./app";
import config from "./app/config";

// Legacy CommonJS db module; converted alongside config/ later.
import { connectDB } from "../config/db";

let server: Server;

const main = async () => {
  await connectDB();

  server = app.listen(config.port, () => {
    console.log(`server running on port ${config.port}`);
  });
};

main();

process.on("uncaughtException", () => {
  console.log("UncaughtException error, shutting the server...");
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  }
});

process.on("unhandledRejection", () => {
  console.log("unhandledRejection error, shutting the server...");
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  }
});
