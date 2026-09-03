import { startNotificationsWorker } from "./notifications.worker";
import { startProductsWorker } from "./products.worker";

export const startWorkers = (): void => {
  startNotificationsWorker();
  startProductsWorker();
};
