import { Worker } from "bullmq";

import { startInboxWorker } from "./inbox.worker";
import { startNotificationsWorker } from "./notifications.worker";
import { startOrdersWorker } from "./orders.worker";
import { startProductsWorker } from "./products.worker";

export const startWorkers = (): Worker[] => [
  startInboxWorker(),
  startNotificationsWorker(),
  startOrdersWorker(),
  startProductsWorker(),
];
