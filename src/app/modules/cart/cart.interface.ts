import { Types } from "mongoose";

export type TCartItem = {
  _id: Types.ObjectId;
  product: Types.ObjectId;
  variant: Types.ObjectId | null;
  qty: number;
};

export type TCart = {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  items: TCartItem[];
  createdAt: Date;
  updatedAt: Date;
};

export type TCartLineOption = {
  attribute: string;
  value: string;
};

export type TCartLineView = {
  lineId: string;
  productId: string;
  variantId: string | null;
  title: string;
  slug: string;
  image: string;
  sku: string;
  options: TCartLineOption[];
  price: number;
  originalPrice: number;
  discount: number;
  qty: number;
  lineTotal: number;
  stock: number;
  isAvailable: boolean;
  unavailableReason: string | null;
};

export type TCartView = {
  items: TCartLineView[];
  subtotal: number;
  updatedAt: Date | null;
};

export type TSetCartItem = {
  productId: string;
  variantId?: string | null;
  qty: number;
};

export type TMergeCart = {
  lines: TSetCartItem[];
};
