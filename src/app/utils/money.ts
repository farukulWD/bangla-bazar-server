export type TMoneyFormat = {
  code: string;
  symbol: string;
  symbolPosition: "before" | "after";
  decimals: number;
  thousandSeparator: string;
  decimalSeparator: string;
};

export const FALLBACK_MONEY_FORMAT: TMoneyFormat = {
  code: "BDT",
  symbol: "৳",
  symbolPosition: "before",
  decimals: 2,
  thousandSeparator: ",",
  decimalSeparator: ".",
};

let active: TMoneyFormat = FALLBACK_MONEY_FORMAT;

export const setMoneyFormat = (format: TMoneyFormat): void => {
  active = format;
};

export const getMoneyFormat = (): TMoneyFormat => active;

export const roundMoney = (
  amount: number,
  decimals: number = active.decimals,
): number => {
  const factor = 10 ** decimals;

  return Math.round((amount + Number.EPSILON) * factor) / factor;
};

const group = (digits: string, separator: string): string =>
  separator ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator) : digits;

export const formatMoney = (
  amount: number,
  format: TMoneyFormat = active,
): string => {
  const rounded = roundMoney(amount, format.decimals);
  const negative = rounded < 0;
  const fixed = Math.abs(rounded).toFixed(format.decimals);
  const [whole, fraction] = fixed.split(".");

  const digits = fraction
    ? `${group(whole, format.thousandSeparator)}${format.decimalSeparator}${fraction}`
    : group(whole, format.thousandSeparator);

  const withSymbol =
    format.symbolPosition === "after"
      ? `${digits} ${format.symbol}`
      : `${format.symbol}${digits}`;

  return negative ? `-${withSymbol}` : withSymbol;
};

export const convertMoney = (
  amount: number,
  rate: number,
  decimals: number,
): number => roundMoney(amount * rate, decimals);
