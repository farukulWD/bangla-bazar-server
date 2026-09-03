import { startNotificationsWorker } from "./notifications.worker";
import { startOrdersWorker } from "./orders.worker";
import { startProductsWorker } from "./products.worker";

export const startWorkers = (): void => {
  startNotificationsWorker();
  startOrdersWorker();
  startProductsWorker();
};
