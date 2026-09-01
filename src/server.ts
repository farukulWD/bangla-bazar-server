import { Server } from "http";
import app from "./app";
import config from "./app/config";
import { startWorkers } from "./app/queues";
import connectDB from "./app/utils/db";
import { logger } from "./app/shared/logger";

let server: Server;

const main = async () => {
  await connectDB();
  // In-process: `start:ts` is a single long-lived node process, so the queue needs
  // no separate runner. Split this into its own entrypoint when it earns one.
  startWorkers();

  server = app.listen(config.port, () => {
    logger.info(`server running on port ${config.port}`);
  });
};

main();

process.on("uncaughtException", () => {
  logger.error("UncaughtException error, shutting the server...");
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  }
});

process.on("unhandledRejection", () => {
  logger.error("unhandledRejection error, shutting the server...");
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  }
});
