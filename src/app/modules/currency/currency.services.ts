import httpStatus from "http-status";
import mongoose, { ClientSession, Types } from "mongoose";

import QueryBuilder from "../../builder/queryBuilder";
import AppError from "../../errors/AppError";
import { TPagination } from "../../interface/common";
import { publishSettingsUpdate } from "../../realtime/realtime.emit";
import { invalidateSettings } from "../settings/settings.cache";
import { SETTINGS_DOC_KEY } from "../settings/settings.constant";
import { Settings } from "../settings/settings.model";
import { settingsServices } from "../settings/settings.services";
import {
  getActiveCurrencies,
  invalidateCurrencies,
} from "./currency.cache";
import {
  CURRENCY_QUERY_CONTROL_KEYS,
  CURRENCY_SEARCHABLE_FIELDS,
  NOT_DELETED,
} from "./currency.constant";
import {
  TActiveCurrencies,
  TCreateCurrency,
  TCurrencyDocument,
  TCurrencyStatus,
  TUpdateCurrency,
} from "./currency.interface";
import { Currency } from "./currency.model";
import { rebaseRate } from "./currency.utils";

const fieldError = (statusCode: number, message: string, path: string) =>
  new AppError(statusCode, message, "", [{ path, message }]);

const findCurrencyOrThrow = async (
  id: string,
  session?: ClientSession,
): Promise<TCurrencyDocument> => {
  const query = Currency.findOne({ _id: id, ...NOT_DELETED });

  if (session) {
    query.session(session);
  }

  const currency = await query;

  if (!currency) {
    throw new AppError(httpStatus.NOT_FOUND, "Currency not found");
  }

  return currency;
};

const assertCodeIsFree = async (
  code: string,
  excludeId?: Types.ObjectId,
): Promise<void> => {
  const clash = await Currency.exists({
    code,
    ...NOT_DELETED,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  });

  if (clash) {
    throw fieldError(
      httpStatus.CONFLICT,
      `The currency "${code}" already exists`,
      "code",
    );
  }
};

/**
 * The store settings still carry the currency the storefront renders with — the
 * client has always read them off `/settings/public`. They stop being editable in
 * the settings panel and become a projection of the base currency, written here so
 * the two can never drift.
 */
const syncSettingsFromBase = async (
  base: TCurrencyDocument,
): Promise<void> => {
  await Settings.findOneAndUpdate(
    { key: SETTINGS_DOC_KEY },
    {
      $set: {
        "store.currencyCode": base.code,
        "store.currencySymbol": base.symbol,
        "store.decimalPlaces": base.decimals,
      },
    },
    { upsert: true, runValidators: true, strict: false },
  );

  invalidateSettings();
  publishSettingsUpdate(await settingsServices.getPublicSettings());
};

/** Any write that could change what a price looks like ends here. */
const refresh = async (base?: TCurrencyDocument | null): Promise<void> => {
  invalidateCurrencies();

  if (base) {
    await syncSettingsFromBase(base);
  }
};

const createCurrency = async (
  payload: TCreateCurrency,
): Promise<TCurrencyDocument> => {
  const code = payload.code.trim().toUpperCase();
  await assertCodeIsFree(code);

  const currency = await Currency.create({
    code,
    name: payload.name,
    symbol: payload.symbol,
    symbolPosition: payload.symbolPosition,
    decimals: payload.decimals,
    thousandSeparator: payload.thousandSeparator,
    decimalSeparator: payload.decimalSeparator,
    rate: payload.rate,
    status: payload.status,
    rateUpdatedAt: new Date(),
  });

  await refresh();

  return currency;
};

const getCurrencies = async (
  query: Record<string, unknown>,
): Promise<{ data: TCurrencyDocument[]; pagination: TPagination }> => {
  const currencyQuery = new QueryBuilder(Currency.find(NOT_DELETED), query)
    .search(CURRENCY_SEARCHABLE_FIELDS)
    .filter(CURRENCY_QUERY_CONTROL_KEYS)
    .sort();

  await currencyQuery.paginate();
  currencyQuery.fields();

  const currencies = await currencyQuery.modelQuery;

  const page = Number(query.page) > 0 ? Number(query.page) : 1;
  const limit = Number(query.limit) > 0 ? Number(query.limit) : 10;

  return {
    data: currencies,
    pagination: {
      page,
      limit,
      total: currencyQuery.total,
      totalPage: Math.ceil(currencyQuery.total / limit),
    },
  };
};

const getPublicCurrencies = async (): Promise<TActiveCurrencies> =>
  getActiveCurrencies();

const getCurrencyById = async (id: string): Promise<TCurrencyDocument> =>
  findCurrencyOrThrow(id);

const updateCurrency = async (
  id: string,
  payload: TUpdateCurrency,
): Promise<TCurrencyDocument> => {
  const currency = await findCurrencyOrThrow(id);

  if (payload.code !== undefined) {
    const code = payload.code.trim().toUpperCase();
    await assertCodeIsFree(code, currency._id);
    currency.code = code;
  }

  if (payload.rate !== undefined) {
    if (currency.isBase && payload.rate !== 1) {
      throw fieldError(
        httpStatus.BAD_REQUEST,
        "The base currency's rate is always 1",
        "rate",
      );
    }
    currency.rate = payload.rate;
    currency.rateUpdatedAt = new Date();
  }

  if (payload.status !== undefined) {
    if (currency.isBase && payload.status !== "active") {
      throw fieldError(
        httpStatus.BAD_REQUEST,
        "The base currency cannot be deactivated",
        "status",
      );
    }
    currency.status = payload.status;
  }

  if (payload.name !== undefined) currency.name = payload.name;
  if (payload.symbol !== undefined) currency.symbol = payload.symbol;
  if (payload.symbolPosition !== undefined) {
    currency.symbolPosition = payload.symbolPosition;
  }
  if (payload.decimals !== undefined) currency.decimals = payload.decimals;
  if (payload.thousandSeparator !== undefined) {
    currency.thousandSeparator = payload.thousandSeparator;
  }
  if (payload.decimalSeparator !== undefined) {
    currency.decimalSeparator = payload.decimalSeparator;
  }

  await currency.save();
  await refresh(currency.isBase ? currency : null);

  return currency;
};

const updateCurrencyRate = async (
  id: string,
  rate: number,
): Promise<TCurrencyDocument> => {
  const currency = await findCurrencyOrThrow(id);

  if (currency.isBase) {
    throw fieldError(
      httpStatus.BAD_REQUEST,
      "The base currency's rate is always 1 — change the base instead",
      "rate",
    );
  }

  currency.rate = rate;
  currency.rateUpdatedAt = new Date();
  await currency.save();

  await refresh();

  return currency;
};

const updateCurrencyStatus = async (
  id: string,
  status: TCurrencyStatus,
): Promise<TCurrencyDocument> => {
  const currency = await findCurrencyOrThrow(id);

  if (currency.isBase && status !== "active") {
    throw fieldError(
      httpStatus.BAD_REQUEST,
      "The base currency cannot be deactivated",
      "status",
    );
  }

  currency.status = status;
  await currency.save();

  await refresh();

  return currency;
};

/**
 * Moving the base re-quotes every other rate against it. Skipping that step would
 * leave the numbers in place while silently changing what they mean, so the whole
 * thing is one transaction: either the shop has a new base and a consistent set of
 * rates, or it has neither.
 */
const setBaseCurrency = async (id: string): Promise<TCurrencyDocument> => {
  const session = await mongoose.startSession();

  let nextBaseId: Types.ObjectId | undefined;

  try {
    await session.withTransaction(async () => {
      const nextBase = await findCurrencyOrThrow(id, session);

      if (nextBase.isBase) {
        throw fieldError(
          httpStatus.BAD_REQUEST,
          `${nextBase.code} is already the base currency`,
          "id",
        );
      }

      if (nextBase.rate <= 0) {
        throw fieldError(
          httpStatus.BAD_REQUEST,
          "A currency with no usable rate cannot become the base",
          "rate",
        );
      }

      const rateUnderOldBase = nextBase.rate;

      const others = await Currency.find({ ...NOT_DELETED, _id: { $ne: nextBase._id } })
        .session(session)
        .select("_id rate isBase");

      // Unset first: the partial unique index allows exactly one base at a time.
      await Currency.updateMany(
        { isBase: true },
        { $set: { isBase: false } },
        { session },
      );

      const now = new Date();

      const writes = others.map((currency) => ({
        updateOne: {
          filter: { _id: currency._id },
          update: {
            $set: {
              rate: rebaseRate(
                currency.isBase ? 1 : currency.rate,
                rateUnderOldBase,
              ),
              rateUpdatedAt: now,
            },
          },
        },
      }));

      if (writes.length) {
        await Currency.bulkWrite(writes, { session });
      }

      await Currency.updateOne(
        { _id: nextBase._id },
        {
          $set: {
            isBase: true,
            rate: 1,
            status: "active",
            rateUpdatedAt: now,
          },
        },
        { session },
      );

      nextBaseId = nextBase._id;
    });
  } finally {
    await session.endSession();
  }

  const base = await findCurrencyOrThrow(String(nextBaseId));
  await refresh(base);

  return base;
};

const deleteCurrency = async (id: string): Promise<TCurrencyDocument> => {
  const currency = await findCurrencyOrThrow(id);

  if (currency.isBase) {
    throw fieldError(
      httpStatus.BAD_REQUEST,
      "The base currency cannot be deleted — set another one first",
      "id",
    );
  }

  currency.isDeleted = true;
  currency.status = "inactive";
  await currency.save();

  await refresh();

  return currency;
};

export const currencyServices = {
  createCurrency,
  getCurrencies,
  getPublicCurrencies,
  getCurrencyById,
  updateCurrency,
  updateCurrencyRate,
  updateCurrencyStatus,
  setBaseCurrency,
  deleteCurrency,
};
