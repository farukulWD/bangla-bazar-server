import { Worker } from "bullmq";
import { Server } from "http";
import mongoose from "mongoose";
import app from "./app";
import config from "./app/config";
import { startWorkers } from "./app/queues";
import { scheduleCouponExpirySweep } from "./app/queues/inbox.queue";
import connectDB from "./app/utils/db";
import { logger } from "./app/shared/logger";
import { closeSocketIO, initializeSocketIO } from "./socket";

let server: Server;
let workers: Worker[] = [];

const main = async () => {
  await connectDB();
  workers = startWorkers();

  server = app.listen(config.port, () => {
    logger.info(`server running on port ${config.port}`);
  });

  initializeSocketIO(server);

  // Upserted on every boot rather than seeded once, so changing the cron in code is
  // enough to change the schedule.
  await scheduleCouponExpirySweep();
};

main();

const describe = (reason: unknown): string => {
  const error = reason as Error;
  return error?.stack || error?.message || String(reason);
};

let shuttingDown = false;

const shutdown = async (signal: string, code: number): Promise<void> => {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  logger.info(`${signal} received, shutting down`);

  try {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await closeSocketIO();
    await Promise.all(workers.map((worker) => worker.close()));
    await mongoose.disconnect();
  } catch (error) {
    logger.error(`Shutdown did not finish cleanly: ${describe(error)}`);
  }

  process.exit(code);
};

process.on("SIGTERM", () => {
  void shutdown("SIGTERM", 0);
});

process.on("SIGINT", () => {
  void shutdown("SIGINT", 0);
});

process.on("uncaughtException", (error) => {
  logger.error(`UncaughtException, shutting the server: ${describe(error)}`);
  void shutdown("uncaughtException", 1);
});

process.on("unhandledRejection", (reason) => {
  logger.error(`unhandledRejection, shutting the server: ${describe(reason)}`);
  void shutdown("unhandledRejection", 1);
});
