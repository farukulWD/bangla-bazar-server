import { Types } from "mongoose";

import { CONTACT_STATUS } from "./contact.constant";

export type TContactStatus = (typeof CONTACT_STATUS)[number];

export type TContact = {
  _id: Types.ObjectId;
  user: Types.ObjectId | null;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: TContactStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type TCreateContact = {
  name: string;
  email: string;
  subject: string;
  message: string;
};
