import { startNotificationsWorker } from "./notifications.worker";

/**
 * Started in-process from server.ts. Keeping the call behind one function is what
 * makes a later split to a dedicated `src/worker.ts` entrypoint a one-file change.
 */
export const startWorkers = (): void => {
  startNotificationsWorker();
};
