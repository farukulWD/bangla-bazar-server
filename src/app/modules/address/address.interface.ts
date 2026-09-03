import { Types } from "mongoose";

export type TAddress = {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  name: string;
  contact: string;
  email: string;
  address: string;
  country: string;
  city: string;
  area: string;
  zipCode: string;
  isDefault: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type TCreateAddress = {
  name: string;
  contact: string;
  email?: string;
  address: string;
  country: string;
  city: string;
  area?: string;
  zipCode?: string;
  isDefault?: boolean;
};

export type TUpdateAddress = Partial<TCreateAddress>;
