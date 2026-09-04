import { Types } from "mongoose";
import z from "zod";

import {
  CURRENCY_DECIMALS_MAX,
  CURRENCY_NAME_MAX,
  CURRENCY_STATUS,
  CURRENCY_SYMBOL_MAX,
  SYMBOL_POSITIONS,
} from "./currency.constant";

const objectId = z
  .string()
  .trim()
  .refine((value) => Types.ObjectId.isValid(value), "That id is not valid");

const code = z
  .string()
  .trim()
  .length(3, "Use a 3-letter currency code")
  .regex(/^[A-Za-z]{3}$/, "A currency code is letters only");

const name = z
  .string()
  .trim()
  .min(1, "Currency name is required")
  .max(CURRENCY_NAME_MAX, "Currency name is too long");

const symbol = z
  .string()
  .trim()
  .min(1, "A currency symbol is required")
  .max(CURRENCY_SYMBOL_MAX, "That symbol is too long");

const symbolPosition = z.enum(SYMBOL_POSITIONS);

const decimals = z
  .int()
  .min(0, "Decimal places cannot be negative")
  .max(CURRENCY_DECIMALS_MAX, `Use at most ${CURRENCY_DECIMALS_MAX} decimals`);

/** Empty means "no separator" — a shop that writes 1234.50 is a valid shop. */
const separator = (label: string) =>
  z.string().max(1, `${label} must be a single character`);

const rate = z
  .number()
  .positive("An exchange rate must be greater than 0")
  .finite();

const status = z.enum(CURRENCY_STATUS);

const currencyBaseSchema = z.object({
  code,
  name,
  symbol,
  symbolPosition: symbolPosition.optional(),
  decimals: decimals.optional(),
  thousandSeparator: separator("A thousand separator").optional(),
  decimalSeparator: separator("A decimal separator").optional(),
  rate,
  status: status.optional(),
});

const idParams = z.object({ id: objectId });

const createCurrencyValidationSchema = z.object({
  body: currencyBaseSchema,
});

const updateCurrencyValidationSchema = z.object({
  params: idParams,
  body: currencyBaseSchema
    .partial()
    .refine((body) => Object.keys(body).length > 0, "Nothing to update"),
});

const updateRateValidationSchema = z.object({
  params: idParams,
  body: z.object({ rate }),
});

const updateStatusValidationSchema = z.object({
  params: idParams,
  body: z.object({ status }),
});

const idParamValidationSchema = z.object({
  params: idParams,
});

export const currencyValidation = {
  createCurrencyValidationSchema,
  updateCurrencyValidationSchema,
  updateRateValidationSchema,
  updateStatusValidationSchema,
  idParamValidationSchema,
};
