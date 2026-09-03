import { Server } from "http";
import app from "./app";
import config from "./app/config";
import { startWorkers } from "./app/queues";
import connectDB from "./app/utils/db";
import { logger } from "./app/shared/logger";

let server: Server;

const main = async () => {
  await connectDB();
  startWorkers();

  server = app.listen(config.port, () => {
    logger.info(`server running on port ${config.port}`);
  });
};

main();

const describe = (reason: unknown): string => {
  const error = reason as Error;
  return error?.stack || error?.message || String(reason);
};

process.on("uncaughtException", (error) => {
  logger.error(`UncaughtException, shutting the server: ${describe(error)}`);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  }
});

process.on("unhandledRejection", (reason) => {
  logger.error(`unhandledRejection, shutting the server: ${describe(reason)}`);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  }
});
