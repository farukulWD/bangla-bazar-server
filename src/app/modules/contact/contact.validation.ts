import { Types } from "mongoose";
import z from "zod";

import {
  CONTACT_EMAIL_MAX,
  CONTACT_MESSAGE_MAX,
  CONTACT_MESSAGE_MIN,
  CONTACT_NAME_MAX,
  CONTACT_STATUS,
  CONTACT_SUBJECT_MAX,
} from "./contact.constant";

const text = (max: number, label: string) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} is too long`);

const objectId = z
  .string()
  .trim()
  .refine((value) => Types.ObjectId.isValid(value), "That id is not valid");

const idParams = z.object({ id: objectId });

const email = text(CONTACT_EMAIL_MAX, "Email").email(
  "A valid email is required",
);

const message = z
  .string({ error: "Message is required" })
  .trim()
  .min(CONTACT_MESSAGE_MIN, "Please write at least a sentence")
  .max(CONTACT_MESSAGE_MAX, "Message is too long");

const createContactValidationSchema = z.object({
  body: z.object({
    name: text(CONTACT_NAME_MAX, "Name"),
    email,
    subject: text(CONTACT_SUBJECT_MAX, "Subject"),
    message,
  }),
});

const updateStatusValidationSchema = z.object({
  params: idParams,
  body: z.object({ status: z.enum(CONTACT_STATUS) }),
});

const idParamValidationSchema = z.object({ params: idParams });

export const contactValidation = {
  createContactValidationSchema,
  updateStatusValidationSchema,
  idParamValidationSchema,
};
