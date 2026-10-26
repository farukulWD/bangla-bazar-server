import { Types } from "mongoose";

import { Product } from "../product/product.model";
import { Review } from "./review.model";

export const recalcProductRating = async (
  productId: Types.ObjectId | string,
): Promise<void> => {
  const _id = new Types.ObjectId(productId);

  const [stats] = await Review.aggregate<{ average: number; count: number }>([
    { $match: { product: _id, status: "approved" } },
    {
      $group: {
        _id: null,
        average: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  const rating = stats
    ? { average: Math.round(stats.average * 10) / 10, count: stats.count }
    : { average: 0, count: 0 };

  await Product.updateOne({ _id }, { $set: { rating } });
};

export const recalcProductRatings = async (
  productIds: (Types.ObjectId | string)[],
): Promise<void> => {
  const unique = [...new Set(productIds.map((id) => id.toString()))];
  await Promise.all(unique.map((id) => recalcProductRating(id)));
};
