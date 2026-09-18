import { HydratedDocument, Types } from "mongoose";

export type TAttributeStatus = "show" | "hide";
export type TAttributeOption = "dropdown" | "radio" | "checkbox";
export type TAttributeType = "attribute" | "extra";

export type TAttributeValue = {
  _id: Types.ObjectId;
  name: string;
  status: TAttributeStatus;
  isDeleted: boolean;
};

export type TAttribute = {
  name: string;
  slug: string;
  option: TAttributeOption;
  type: TAttributeType;
  values: TAttributeValue[];
  status: TAttributeStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type TAttributeDocument = HydratedDocument<TAttribute>;

export type TCreateAttributeValue = {
  name: string;
  status?: TAttributeStatus;
};

export type TCreateAttribute = {
  name: string;
  slug?: string;
  option: TAttributeOption;
  type?: TAttributeType;
  status?: TAttributeStatus;
  values?: TCreateAttributeValue[];
};

export type TUpdateAttribute = Partial<Omit<TCreateAttribute, "values">>;

export type TAttributeResponse = TAttribute & { _id: Types.ObjectId };

export type TBulkResult = {
  succeeded: number;
  failed: { index: number; identifier?: string; error: string }[];
};
