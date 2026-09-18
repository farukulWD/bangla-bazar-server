import { HydratedDocument, Types } from "mongoose";

import { TMoneyFormat } from "../../utils/money";
import { CURRENCY_STATUS, SYMBOL_POSITIONS } from "./currency.constant";

export type TCurrencyStatus = (typeof CURRENCY_STATUS)[number];

export type TSymbolPosition = (typeof SYMBOL_POSITIONS)[number];

export type TCurrency = {
  _id: Types.ObjectId;
  code: string;
  name: string;
  symbol: string;
  symbolPosition: TSymbolPosition;
  decimals: number;
  thousandSeparator: string;
  decimalSeparator: string;

  rate: number;
  isBase: boolean;
  status: TCurrencyStatus;
  isDeleted: boolean;
  rateUpdatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type TCurrencyDocument = HydratedDocument<TCurrency>;

export type TCreateCurrency = {
  code: string;
  name: string;
  symbol: string;
  symbolPosition?: TSymbolPosition;
  decimals?: number;
  thousandSeparator?: string;
  decimalSeparator?: string;
  rate: number;
  status?: TCurrencyStatus;
};

export type TUpdateCurrency = Partial<TCreateCurrency>;

/** What the storefront needs to render a price in a currency it did not store. */
export type TCurrencyView = TMoneyFormat & {
  _id: Types.ObjectId;
  name: string;
  rate: number;
  isBase: boolean;
  status: TCurrencyStatus;
  rateUpdatedAt: Date;
};

export type TActiveCurrencies = {
  base: string;
  currencies: TCurrencyView[];
};
