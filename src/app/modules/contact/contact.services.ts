import httpStatus from "http-status";
import { Types } from "mongoose";

import QueryBuilder from "../../builder/queryBuilder";
import AppError from "../../errors/AppError";
import { TPagination } from "../../interface/common";
import {
  CONTACT_QUERY_CONTROL_KEYS,
  CONTACT_SEARCHABLE_FIELDS,
} from "./contact.constant";
import { TContact, TContactStatus, TCreateContact } from "./contact.interface";
import { Contact } from "./contact.model";

const contactNotFound = () =>
  new AppError(httpStatus.NOT_FOUND, "Message not found");

const createContact = async (
  payload: TCreateContact,
  user?: Types.ObjectId,
): Promise<TContact> => {
  const created = await Contact.create({
    user: user ?? null,
    name: payload.name,
    email: payload.email,
    subject: payload.subject,
    message: payload.message,
  });

  return created.toObject<TContact>();
};

const getContacts = async (
  query: Record<string, unknown>,
): Promise<{ data: TContact[]; pagination: TPagination }> => {
  const contactQuery = new QueryBuilder(Contact.find(), query)
    .search(CONTACT_SEARCHABLE_FIELDS)
    .filter(CONTACT_QUERY_CONTROL_KEYS)
    .sort();

  await contactQuery.paginate();
  contactQuery.fields();

  const contacts = await contactQuery.modelQuery.lean<TContact[]>();

  const page = Number(query.page) > 0 ? Number(query.page) : 1;
  const limit = Number(query.limit) > 0 ? Number(query.limit) : 10;

  return {
    data: contacts,
    pagination: {
      page,
      limit,
      total: contactQuery.total,
      totalPage: Math.ceil(contactQuery.total / limit),
    },
  };
};

const getContactById = async (id: string): Promise<TContact> => {
  const contact = await Contact.findById(id).lean<TContact | null>();

  if (!contact) {
    throw contactNotFound();
  }

  return contact;
};

const updateContactStatus = async (
  id: string,
  status: TContactStatus,
): Promise<TContact> => {
  const updated = await Contact.findByIdAndUpdate(
    id,
    { $set: { status } },
    { new: true, runValidators: true },
  ).lean<TContact | null>();

  if (!updated) {
    throw contactNotFound();
  }

  return updated;
};

const deleteContact = async (id: string): Promise<TContact> => {
  const deleted = await Contact.findByIdAndDelete(id).lean<TContact | null>();

  if (!deleted) {
    throw contactNotFound();
  }

  return deleted;
};

export const contactServices = {
  createContact,
  getContacts,
  getContactById,
  updateContactStatus,
  deleteContact,
};
