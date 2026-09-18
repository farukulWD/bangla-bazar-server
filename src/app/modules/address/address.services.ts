import httpStatus from "http-status";
import { Types } from "mongoose";

import AppError from "../../errors/AppError";
import { ADDRESS_MAX_PER_USER } from "./address.constant";
import { TAddress, TCreateAddress, TUpdateAddress } from "./address.interface";
import { Address } from "./address.model";

const NOT_DELETED = { isDeleted: false };

const addressNotFound = () =>
  new AppError(httpStatus.NOT_FOUND, "Address not found");

const isDuplicateKeyError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  (error as { code?: number }).code === 11000;

const toObjectId = (id: string): Types.ObjectId => {
  if (!Types.ObjectId.isValid(id)) {
    throw addressNotFound();
  }

  return new Types.ObjectId(id);
};

const promoteDefault = async (
  user: Types.ObjectId,
  addressId: Types.ObjectId,
): Promise<TAddress> => {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await Address.updateMany(
      { user, isDefault: true, ...NOT_DELETED, _id: { $ne: addressId } },
      { $set: { isDefault: false } },
    );

    try {
      const promoted = await Address.findOneAndUpdate(
        { _id: addressId, user, ...NOT_DELETED },
        { $set: { isDefault: true } },
        { new: true },
      ).lean<TAddress | null>();

      if (!promoted) {
        throw addressNotFound();
      }

      return promoted;
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }
    }
  }

  throw new AppError(
    httpStatus.CONFLICT,
    "Your addresses are being changed from somewhere else. Please try again.",
  );
};

/** After a delete the user must still have a default, as long as any address remains. */
const ensureDefault = async (user: Types.ObjectId): Promise<void> => {
  const hasDefault = await Address.exists({
    user,
    isDefault: true,
    ...NOT_DELETED,
  });

  if (hasDefault) {
    return;
  }

  const newest = await Address.findOne({ user, ...NOT_DELETED })
    .sort({ createdAt: -1 })
    .select("_id")
    .lean<{ _id: Types.ObjectId } | null>();

  if (!newest) {
    return;
  }

  await promoteDefault(user, newest._id);
};

const listAddresses = async (user: Types.ObjectId): Promise<TAddress[]> =>
  Address.find({ user, ...NOT_DELETED })
    .sort({ isDefault: -1, createdAt: -1 })
    .lean<TAddress[]>();

const createAddress = async (
  user: Types.ObjectId,
  payload: TCreateAddress,
): Promise<TAddress> => {
  const existing = await Address.countDocuments({ user, ...NOT_DELETED });

  if (existing >= ADDRESS_MAX_PER_USER) {
    const message = `You can save at most ${ADDRESS_MAX_PER_USER} addresses`;
    throw new AppError(httpStatus.BAD_REQUEST, message, "", [
      { path: "address", message },
    ]);
  }

  const created = await Address.create({
    user,
    name: payload.name,
    contact: payload.contact,
    email: payload.email ?? "",
    address: payload.address,
    country: payload.country,
    city: payload.city,
    area: payload.area ?? "",
    zipCode: payload.zipCode ?? "",
    isDefault: false,
  });

  if (payload.isDefault === true || existing === 0) {
    return promoteDefault(user, created._id);
  }

  return created.toObject<TAddress>();
};

const updateAddress = async (
  user: Types.ObjectId,
  id: string,
  payload: TUpdateAddress,
): Promise<TAddress> => {
  const addressId = toObjectId(id);

  const { isDefault, ...fields } = payload;

  const updated = await Address.findOneAndUpdate(
    { _id: addressId, user, ...NOT_DELETED },
    { $set: fields },
    { new: true, runValidators: true },
  ).lean<TAddress | null>();

  if (!updated) {
    throw addressNotFound();
  }

  if (isDefault === true) {
    return promoteDefault(user, addressId);
  }

  return updated;
};

const deleteAddress = async (
  user: Types.ObjectId,
  id: string,
): Promise<TAddress> => {
  const addressId = toObjectId(id);

  const deleted = await Address.findOneAndUpdate(
    { _id: addressId, user, ...NOT_DELETED },
    { $set: { isDeleted: true, isDefault: false } },
    { new: true },
  ).lean<TAddress | null>();

  if (!deleted) {
    throw addressNotFound();
  }

  await ensureDefault(user);

  return deleted;
};

export const addressServices = {
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
};
