import { Worker } from "bullmq";
import fs from "fs/promises";
import path from "path";
import { productServices } from "../modules/product/product.services";
import { Product } from "../modules/product/product.model";
import { sendImageToCloudinary } from "../utils/sendImageToCloudinary";
import {
  BULK_EXPORT_JOB,
  BULK_IMPORT_JOB,
  CASCADE_ATTRIBUTE_VALUE_JOB,
  CASCADE_CATEGORY_JOB,
  IMAGE_UPLOAD_JOB,
  PRODUCTS_QUEUE_NAME,
  TBulkExportJob,
  TBulkImportJob,
  TCascadeAttributeValueJob,
  TCascadeCategoryJob,
  TImageUploadJob,
} from "./products.queue";
import { queueConnection } from "./queue.config";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const runExport = async (payload: TBulkExportJob) => {
  const rows = await productServices.exportProducts(payload);
  const file = path.join(UPLOAD_DIR, `products-export-${Date.now()}.json`);

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(file, JSON.stringify(rows, null, 2));

  const uploaded = await sendImageToCloudinary(
    path.basename(file, ".json"),
    file,
    "application/json",
  );

  return { count: rows.length, url: uploaded.secure_url as string };
};

const runImageUpload = async (payload: TImageUploadJob) => {
  const urls: string[] = [];

  for (const file of payload.files) {
    const uploaded = await sendImageToCloudinary(
      `product-image-${payload.productId}-${Date.now()}`,
      file.path,
      file.mimetype,
    );
    urls.push(uploaded.secure_url as string);
  }

  await Product.updateOne(
    { _id: payload.productId },
    { $push: { images: { $each: urls } }, $set: { imageStatus: "ready" } },
  );

  return { uploaded: urls.length };
};

export const startProductsWorker = (): Worker => {
  const worker = new Worker(
    PRODUCTS_QUEUE_NAME,
    async (job) => {
      switch (job.name) {
        case BULK_IMPORT_JOB:
          return productServices.bulkCreateProducts(
            (job.data as TBulkImportJob).rows,
          );
        case BULK_EXPORT_JOB:
          return runExport(job.data as TBulkExportJob);
        case IMAGE_UPLOAD_JOB:
          return runImageUpload(job.data as TImageUploadJob);
        case CASCADE_ATTRIBUTE_VALUE_JOB: {
          const { attributeId, valueId } =
            job.data as TCascadeAttributeValueJob;
          return productServices.stripAttributeValue(attributeId, valueId);
        }
        case CASCADE_CATEGORY_JOB:
          return productServices.stripCategory(
            (job.data as TCascadeCategoryJob).categoryIds,
          );
        default:
          return null;
      }
    },
    queueConnection,
  );

  worker.on("failed", async (job, err) => {
    console.error(`Product job "${job?.name}" failed: ${err.message}`);

    const attempts = job?.opts?.attempts ?? 1;
    if (!job || job.attemptsMade < attempts) {
      return;
    }

    if (job.name === IMAGE_UPLOAD_JOB) {
      const payload = job.data as TImageUploadJob;

      await Product.updateOne(
        { _id: payload.productId },
        { $set: { imageStatus: "failed" } },
      );

      await Promise.all(
        payload.files.map((file) =>
          fs.unlink(file.path).catch(() => undefined),
        ),
      );
    }
  });

  return worker;
};
