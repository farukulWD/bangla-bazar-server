import {
  FALLBACK_MONEY_FORMAT,
  TMoneyFormat,
  setMoneyFormat,
} from "../../utils/money";
import { CURRENCY_CACHE_TTL_MS } from "./currency.constant";
import { TActiveCurrencies, TCurrency } from "./currency.interface";
import { Currency } from "./currency.model";
import { toCurrencyView, toMoneyFormat } from "./currency.utils";

let cached: { value: TActiveCurrencies; expiresAt: number } | null = null;

let inFlight: Promise<TActiveCurrencies> | null = null;

const load = async (): Promise<TActiveCurrencies> => {
  const rows = await Currency.find({
    isDeleted: { $ne: true },
    $or: [{ status: "active" }, { isBase: true }],
  })
    .sort({ isBase: -1, code: 1 })
    .lean<TCurrency[]>();

  const base = rows.find((row) => row.isBase);

  // Before the first seed there is no base row; formatting still has to work.
  setMoneyFormat(base ? toMoneyFormat(base) : FALLBACK_MONEY_FORMAT);

  return {
    base: base ? base.code : FALLBACK_MONEY_FORMAT.code,
    currencies: rows.map(toCurrencyView),
  };
};

export const getActiveCurrencies = async (): Promise<TActiveCurrencies> => {
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = load()
    .then((value) => {
      cached = { value, expiresAt: Date.now() + CURRENCY_CACHE_TTL_MS };
      return value;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
};

/**
 * The one call money-handling code should make: it guarantees the synchronous
 * `formatMoney` snapshot has been primed before the caller renders anything.
 */
export const getBaseMoneyFormat = async (): Promise<TMoneyFormat> => {
  const { base, currencies } = await getActiveCurrencies();
  const row = currencies.find((currency) => currency.code === base);

  return row ? toMoneyFormat(row) : FALLBACK_MONEY_FORMAT;
};

export const getBaseCurrencyCode = async (): Promise<string> =>
  (await getActiveCurrencies()).base;

export const invalidateCurrencies = (): void => {
  cached = null;
};
