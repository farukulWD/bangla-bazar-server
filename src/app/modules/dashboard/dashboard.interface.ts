export type TGranularity = "day" | "week";

export type TRangeMeta = {
  from: string;
  to: string;
  granularity: TGranularity;
};

export type TScalar = {
  value: number;
  previous: number;
};

export type TSeriesPoint = {
  bucket: string;
  value: number;
};

export type TSeries = {
  granularity: TGranularity;
  points: TSeriesPoint[];
};

export type TCategory = {
  key: string;
  label: string;
  value: number;
};

export type TTopProduct = TCategory & {
  quantity: number;
};

export type TCommercialResponse = {
  range: TRangeMeta;
  revenue: TScalar;
  orders: TScalar;
  averageOrderValue: TScalar;
  receivables: number;
  cancelledOrders: TScalar;
  revenueSeries: TSeries;
  orderSeries: TSeries;
  paymentMix: TCategory[];
  statusFunnel: TCategory[];
  topProducts: TTopProduct[];
  ordersByCity: TCategory[];
};

export type TOperationsTile = {
  key: string;
  label: string;
  count: number;
  href: string;
  tone: "neutral" | "warn";
};

export type TOperationsResponse = {
  tiles: TOperationsTile[];
};

export type TGrowthResponse = {
  range: TRangeMeta;
  signups: TScalar;
  signupSeries: TSeries;
  activeSplit: TCategory[];
  verifiedSplit: TCategory[];
};

export type TCatalogResponse = {
  totalProducts: number;
  statusSplit: TCategory[];
  stockSplit: TCategory[];
  productsPerCategory: TCategory[];
};
