import { TMoneyFormat } from "../../utils/money";
import { TCurrency, TCurrencyDocument, TCurrencyView } from "./currency.interface";

type TCurrencyLike = TCurrency | TCurrencyDocument;

/** Loose on purpose: both a stored row and an already-narrowed view can format. */
type TFormatSource = Pick<
  TCurrency,
  | "code"
  | "symbol"
  | "symbolPosition"
  | "decimals"
  | "thousandSeparator"
  | "decimalSeparator"
>;

export const toMoneyFormat = (currency: TFormatSource): TMoneyFormat => ({
  code: currency.code,
  symbol: currency.symbol,
  symbolPosition: currency.symbolPosition,
  decimals: currency.decimals,
  thousandSeparator: currency.thousandSeparator,
  decimalSeparator: currency.decimalSeparator,
});

export const toCurrencyView = (currency: TCurrencyLike): TCurrencyView => ({
  ...toMoneyFormat(currency),
  _id: currency._id,
  name: currency.name,
  rate: currency.rate,
  isBase: currency.isBase,
  status: currency.status,
  rateUpdatedAt: currency.rateUpdatedAt,
});

/**
 * Re-quotes a rate against a new base. Rates are "units per one base", so moving
 * the base from A to B divides every rate by B's rate under A — otherwise the
 * numbers survive the switch but stop meaning anything.
 */
export const rebaseRate = (rate: number, newBaseRateUnderOldBase: number): number =>
  rate / newBaseRateUnderOldBase;
