import axios from "axios";
import httpStatus from "http-status";

import config from "../../config";
import AppError from "../../errors/AppError";
import { logger } from "../../shared/logger";
import { TOrder } from "../order/order.interface";
import {
  SSL_INIT_PATH,
  SSL_INIT_TIMEOUT_MS,
  SSL_LIVE_BASE,
  SSL_PRODUCT_CATEGORY,
  SSL_PRODUCT_NAME_MAX,
  SSL_PRODUCT_PROFILE,
  SSL_SANDBOX_BASE,
  SSL_SHIPPING_METHOD,
  SSL_VALIDATE_TIMEOUT_MS,
  SSL_VALIDATOR_PATH,
} from "./payment.constant";
import { TPayment } from "./payment.interface";

export type TSslInitResponse = {
  status?: string;
  failedreason?: string;
  sessionkey?: string;
  GatewayPageURL?: string;
  redirectGatewayURL?: string;
};

export type TSslValidationResponse = {
  status?: string;
  tran_id?: string;
  val_id?: string;
  tran_date?: string;
  amount?: string | number;
  store_amount?: string | number;
  currency?: string;
  bank_tran_id?: string;
  card_type?: string;
  card_issuer?: string;
  risk_level?: string;
  risk_title?: string;
  error?: string;
  value_a?: string;
  value_b?: string;
  value_c?: string;
  value_d?: string;
};

const base = (): string =>
  config.ssl_is_live ? SSL_LIVE_BASE : SSL_SANDBOX_BASE;

const credentials = (): { store_id: string; store_passwd: string } => {
  if (
    !config.ssl_store_id ||
    !config.ssl_store_password ||
    !config.server_public_url
  ) {
    logger.error(
      "SSLCommerz is not configured: STORE_ID, STORE_PASSWORD and SERVER_PUBLIC_URL must all be set.",
    );

    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Online payment is not configured on this server",
    );
  }

  return {
    store_id: config.ssl_store_id,
    store_passwd: config.ssl_store_password,
  };
};

const callbackUrl = (leaf: string): string =>
  new URL(
    `/api/v1/payments/sslcommerz/${leaf}`,
    config.server_public_url,
  ).toString();

const productName = (order: TOrder): string => {
  const [first, ...rest] = order.items;
  const label =
    rest.length > 0 ? `${first.title} +${rest.length} more` : first.title;

  return label.slice(0, SSL_PRODUCT_NAME_MAX);
};

const createSession = async (
  order: TOrder,

  payment: Pick<TPayment, "tranId" | "amount" | "currency">,
  customerEmail: string,
): Promise<TSslInitResponse> => {
  const address = order.address;

  const body = new URLSearchParams({
    ...credentials(),
    total_amount: String(payment.amount),
    currency: payment.currency,
    tran_id: payment.tranId,
    success_url: callbackUrl("success"),
    fail_url: callbackUrl("fail"),
    cancel_url: callbackUrl("cancel"),
    ipn_url: callbackUrl("ipn"),

    shipping_method: SSL_SHIPPING_METHOD,
    num_of_item: String(order.items.length),
    product_name: productName(order),
    product_category: SSL_PRODUCT_CATEGORY,
    product_profile: SSL_PRODUCT_PROFILE,
    emi_option: "0",

    cus_name: address.name,
    cus_email: customerEmail,
    cus_add1: address.address,
    cus_city: address.city,
    cus_state: address.area,
    cus_postcode: address.zipCode,
    cus_country: address.country,
    cus_phone: address.contact,

    ship_name: address.name,
    ship_add1: address.address,
    ship_city: address.city,
    ship_state: address.area,
    ship_postcode: address.zipCode,
    ship_country: address.country,

    value_a: order._id.toString(),
    value_b: order.user.toString(),
    value_c: payment.tranId,
    value_d: String(order.invoice),
  });

  const response = await axios.post<TSslInitResponse>(
    `${base()}${SSL_INIT_PATH}`,
    body.toString(),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: SSL_INIT_TIMEOUT_MS,
      validateStatus: () => true,
    },
  );

  if (response.status < 200 || response.status >= 300) {
    return {
      status: "FAILED",
      failedreason: `Gateway returned HTTP ${response.status}`,
    };
  }

  return response.data ?? {};
};

const validate = async (valId: string): Promise<TSslValidationResponse> => {
  const response = await axios.get<TSslValidationResponse>(
    `${base()}${SSL_VALIDATOR_PATH}`,
    {
      params: { ...credentials(), val_id: valId, v: 1, format: "json" },
      timeout: SSL_VALIDATE_TIMEOUT_MS,
    },
  );

  return response.data ?? {};
};

export const sslGateway = { createSession, validate };
