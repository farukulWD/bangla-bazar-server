import z from "zod";

import {
  ADDRESS_CONTACT_MAX,
  ADDRESS_DETAIL_MAX,
  ADDRESS_EMAIL_MAX,
  ADDRESS_NAME_MAX,
  ADDRESS_PLACE_MAX,
  ADDRESS_ZIP_MAX,
} from "./address.constant";

const text = (max: number, label: string) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} is too long`);

const optionalText = (max: number, label: string) =>
  z
    .string({ error: `${label} must be text` })
    .trim()
    .max(max, `${label} is too long`);

const contact = text(ADDRESS_CONTACT_MAX, "Contact number");

const email = z
  .string()
  .trim()
  .max(ADDRESS_EMAIL_MAX, "Email is too long")
  .email("A valid email is required")
  .or(z.literal(""));

// Only `true` is accepted: a default is cleared by promoting another address, never by
// unsetting this one, or a user could end up with no default at all.
const isDefault = z
  .boolean()
  .refine(
    (value) => value === true,
    "To change the default, set isDefault on the address you want instead",
  );

const addressBodySchema = z.object({
  name: text(ADDRESS_NAME_MAX, "Name"),
  contact,
  email: email.optional(),
  address: text(ADDRESS_DETAIL_MAX, "Address"),
  country: text(ADDRESS_PLACE_MAX, "Country"),
  city: text(ADDRESS_PLACE_MAX, "City"),
  area: optionalText(ADDRESS_PLACE_MAX, "Area").optional(),
  zipCode: optionalText(ADDRESS_ZIP_MAX, "Zip code").optional(),
  isDefault: isDefault.optional(),
});

const createAddressValidationSchema = z.object({
  body: addressBodySchema,
});

const updateAddressValidationSchema = z.object({
  body: addressBodySchema
    .partial()
    .refine((body) => Object.keys(body).length > 0, "Nothing to update"),
});

export const addressValidation = {
  createAddressValidationSchema,
  updateAddressValidationSchema,
};
