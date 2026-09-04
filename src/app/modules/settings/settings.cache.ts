import { SETTINGS_CACHE_TTL_MS, SETTINGS_DOC_KEY } from "./settings.constant";
import { SETTINGS_DEFAULTS } from "./settings.defaults";
import { TSettings, TSettingsValues } from "./settings.interface";
import { Settings } from "./settings.model";
import { deepMerge } from "./settings.utils";

let cached: { value: TSettingsValues; expiresAt: number } | null = null;

let inFlight: Promise<TSettingsValues> | null = null;

const load = async (): Promise<TSettingsValues> => {
  const stored = await Settings.findOne({
    key: SETTINGS_DOC_KEY,
  }).lean<TSettings | null>();

  return {
    store: deepMerge(SETTINGS_DEFAULTS.store, stored?.store),
    checkout: deepMerge(SETTINGS_DEFAULTS.checkout, stored?.checkout),
    integrations: deepMerge(
      SETTINGS_DEFAULTS.integrations,
      stored?.integrations,
    ),
    storefront: deepMerge(SETTINGS_DEFAULTS.storefront, stored?.storefront),
  };
};

export const getSettings = async (): Promise<TSettingsValues> => {
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = load()
    .then((value) => {
      cached = { value, expiresAt: Date.now() + SETTINGS_CACHE_TTL_MS };
      return value;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
};

export const invalidateSettings = (): void => {
  cached = null;
};
