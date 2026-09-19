import httpStatus from "http-status";
import { Types } from "mongoose";

import QueryBuilder from "../../builder/queryBuilder";
import AppError from "../../errors/AppError";
import { TPagination } from "../../interface/common";
import { notify } from "../notification/notification.emit";
import {
  CONTACT_QUERY_CONTROL_KEYS,
  CONTACT_SEARCHABLE_FIELDS,
} from "./contact.constant";
import {
  TContactDocument,
  TContactStatus,
  TCreateContact,
} from "./contact.interface";
import { Contact } from "./contact.model";

const NOT_DELETED = { isDeleted: { $ne: true } };

const findContactOrThrow = async (id: string): Promise<TContactDocument> => {
  const contact = await Contact.findOne({ _id: id, ...NOT_DELETED });

  if (!contact) {
    throw new AppError(httpStatus.NOT_FOUND, "Message not found");
  }

  return contact;
};

const createContact = async (
  payload: TCreateContact,
  userId?: Types.ObjectId,
): Promise<TContactDocument> => {
  const contact = await Contact.create({
    user: userId ?? null,
    name: payload.name,
    email: payload.email,
    subject: payload.subject,
    message: payload.message,
  });

  notify({
    event: "contact.received",
    contactId: contact._id.toString(),
    name: contact.name,
    subject: contact.subject,
  });

  return contact;
};

const getContacts = async (
  query: Record<string, unknown>,
): Promise<{ data: TContactDocument[]; pagination: TPagination }> => {
  const from = query.from ? new Date(String(query.from)) : undefined;
  const to = query.to ? new Date(String(query.to)) : undefined;

  const contactQuery = new QueryBuilder(Contact.find(NOT_DELETED), query)
    .search(CONTACT_SEARCHABLE_FIELDS)
    .filter(CONTACT_QUERY_CONTROL_KEYS)
    .dateRange("createdAt", from, to)
    .sort();

  await contactQuery.paginate();
  contactQuery.fields();

  const contacts = await contactQuery.modelQuery;

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

const getContactById = async (id: string): Promise<TContactDocument> =>
  findContactOrThrow(id);

const updateContactStatus = async (
  id: string,
  status: TContactStatus,
): Promise<TContactDocument> => {
  const contact = await findContactOrThrow(id);
  contact.status = status;
  await contact.save();

  return contact;
};

const deleteContact = async (id: string): Promise<{ deleted: number }> => {
  const contact = await findContactOrThrow(id);
  contact.isDeleted = true;
  await contact.save();

  return { deleted: 1 };
};

export const contactServices = {
  createContact,
  getContacts,
  getContactById,
  updateContactStatus,
  deleteContact,
};
