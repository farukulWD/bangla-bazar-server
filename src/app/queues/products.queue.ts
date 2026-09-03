import { Queue } from "bullmq";
import { JOB_ATTEMPTS, JOB_BACKOFF_MS, queueConnection } from "./queue.config";

export const PRODUCTS_QUEUE_NAME = "products";

export const BULK_IMPORT_JOB = "bulk-import";
export const BULK_EXPORT_JOB = "bulk-export";
export const CASCADE_ATTRIBUTE_VALUE_JOB = "cascade-attribute-value";
export const CASCADE_CATEGORY_JOB = "cascade-category";
export const IMAGE_UPLOAD_JOB = "image-upload";

export type TBulkImportJob = { rows: unknown[] };

export type TBulkExportJob = { status?: string; category?: string };

export type TCascadeAttributeValueJob = {
  attributeId: string;
  valueId?: string;
};

export type TCascadeCategoryJob = { categoryIds: string[] };

export type TImageUploadJob = {
  productId: string;
  files: { path: string; mimetype: string }[];
};

export const productsQueue = new Queue(PRODUCTS_QUEUE_NAME, {
  ...queueConnection,
  defaultJobOptions: {
    attempts: JOB_ATTEMPTS,
    backoff: { type: "exponential", delay: JOB_BACKOFF_MS },
    removeOnComplete: 1000,
    removeOnFail: 1000,
  },
});

export const queueBulkImport = async (job: TBulkImportJob): Promise<string> => {
  const added = await productsQueue.add(BULK_IMPORT_JOB, job);
  return added.id as string;
};

export const queueBulkExport = async (job: TBulkExportJob): Promise<string> => {
  const added = await productsQueue.add(BULK_EXPORT_JOB, job);
  return added.id as string;
};

export const queueImageUpload = async (job: TImageUploadJob): Promise<void> => {
  await productsQueue.add(IMAGE_UPLOAD_JOB, job);
};

export const queueCascadeAttributeValue = async (
  job: TCascadeAttributeValueJob,
): Promise<void> => {
  await productsQueue.add(CASCADE_ATTRIBUTE_VALUE_JOB, job);
};

export const queueCascadeCategory = async (
  job: TCascadeCategoryJob,
): Promise<void> => {
  await productsQueue.add(CASCADE_CATEGORY_JOB, job);
};

export const getProductJob = async (jobId: string) => {
  const job = await productsQueue.getJob(jobId);

  if (!job) {
    return null;
  }

  return {
    id: job.id,
    name: job.name,
    state: await job.getState(),
    result: job.returnvalue,
    failedReason: job.failedReason,
  };
};
