import httpStatus from "http-status";

import AppError from "../../errors/AppError";
import { publishSettingsUpdate } from "../../realtime/realtime.emit";
import { sendImageToCloudinary } from "../../utils/sendImageToCloudinary";
import { getSettings, invalidateSettings } from "./settings.cache";
import { PUBLIC_FIELD_PATHS, SETTINGS_DOC_KEY } from "./settings.constant";
import { SETTINGS_DEFAULTS } from "./settings.defaults";
import { TSettingsGroup, TSettingsValues } from "./settings.interface";
import { Settings } from "./settings.model";
import { GROUP_UPDATE_SCHEMAS } from "./settings.validation";
import {
  dropUnchangedSecrets,
  pickPaths,
  redactSecrets,
  toDotPaths,
} from "./settings.utils";

const publicView = (settings: TSettingsValues) =>
  pickPaths(settings, PUBLIC_FIELD_PATHS);

const getPublicSettings = async () => publicView(await getSettings());

const getAllSettings = async () => redactSecrets(await getSettings());

const getSettingsGroup = async (group: TSettingsGroup) => {
  const settings = redactSecrets(await getSettings());
  return settings[group];
};

const announce = async (): Promise<void> => {
  publishSettingsUpdate(await getPublicSettings());
};

const updateSettingsGroup = async (
  group: TSettingsGroup,
  payload: Record<string, unknown>,
) => {
  const parsed = GROUP_UPDATE_SCHEMAS[group].parse(payload);

  const writes = dropUnchangedSecrets(toDotPaths(group, parsed));

  if (Object.keys(writes).length === 0) {
    throw new AppError(httpStatus.BAD_REQUEST, "Nothing to update");
  }

  await Settings.findOneAndUpdate(
    { key: SETTINGS_DOC_KEY },
    { $set: writes },
    {
      upsert: true,
      runValidators: true,
      strict: false,
    },
  );

  invalidateSettings();
  await announce();

  return getSettingsGroup(group);
};

const resetSettingsGroup = async (group: TSettingsGroup) => {
  await Settings.findOneAndUpdate(
    { key: SETTINGS_DOC_KEY },
    { $set: { [group]: SETTINGS_DEFAULTS[group] } },
    { upsert: true, runValidators: true, strict: false },
  );

  invalidateSettings();
  await announce();

  return getSettingsGroup(group);
};

const uploadSettingsAsset = async (file?: Express.Multer.File) => {
  if (!file) {
    throw new AppError(httpStatus.BAD_REQUEST, "No file was uploaded");
  }

  const result = await sendImageToCloudinary(
    `settings-${Date.now()}`,
    file.path,
    file.mimetype,
  );

  return { url: result.secure_url as string };
};

export const settingsServices = {
  getPublicSettings,
  getAllSettings,
  getSettingsGroup,
  updateSettingsGroup,
  resetSettingsGroup,
  uploadSettingsAsset,
};
