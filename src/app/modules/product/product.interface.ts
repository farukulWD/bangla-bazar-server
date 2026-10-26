import { HydratedDocument, Types } from "mongoose";

export type TProductStatus = "show" | "hide";
export type TImageStatus = "ready" | "processing" | "failed";

export type TProductPrices = {
  originalPrice: number;
  price: number;
  discount: number;
};

export type TVariantOption = {
  attributeId: Types.ObjectId;
  valueId: Types.ObjectId;
};

export type TProductVariant = {
  _id: Types.ObjectId;
  options: TVariantOption[];
  sku?: string;
  barcode?: string;
  originalPrice: number;
  price: number;
  discount: number;
  stock: number;
  image?: string;
  isDeleted: boolean;
};

export type TProductRating = {
  average: number;
  count: number;
};

export type TProduct = {
  title: string;
  description?: string;
  slug: string;
  sku?: string;
  barcode?: string;
  category: Types.ObjectId;
  categories: Types.ObjectId[];
  images: string[];
  imageStatus: TImageStatus;
  tags: string[];
  prices: TProductPrices;
  stock: number;
  sales: number;
  rating: TProductRating;
  isCombination: boolean;
  variants: TProductVariant[];
  status: TProductStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type TProductDocument = HydratedDocument<TProduct>;

export type TCreateVariantOption = {
  attributeId: string;
  valueId: string;
};

export type TCreateVariant = {
  _id?: string;
  options: TCreateVariantOption[];
  sku?: string;
  barcode?: string;
  originalPrice: number;
  price: number;
  stock?: number;
  image?: string;
};

export type TCreateProduct = {
  title: string;
  description?: string;
  slug?: string;
  sku?: string;
  barcode?: string;
  category: string;
  categories?: string[];
  images?: string[];
  tags?: string[];
  prices: Omit<TProductPrices, "discount">;
  stock?: number;
  variants?: TCreateVariant[];
  status?: TProductStatus;
};

export type TUpdateProduct = Partial<TCreateProduct>;

export type TProductResponse = TProduct & { _id: Types.ObjectId };

export type TStoreProducts = {
  products: TProductResponse[];
  popularProducts: TProductResponse[];
  relatedProducts: TProductResponse[];
  discountedProducts: TProductResponse[];
};

export type TBulkResult = {
  succeeded: number;
  failed: { index: number; identifier?: string; error: string }[];
};
