import config from "../../config";
import { USER_ROLE } from "./user.constant";
import { model, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import { TUser, UserModel } from "./user.interface";

const userSchema = new Schema<TUser, UserModel>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      unique: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: false,
    },
    role: {
      type: String,
      enum: USER_ROLE,
      default: "customer",
    },
    password: {
      type: String,
      required: false,
      select: false,
    },
    passwordChangedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    image: {
      type: String,
      required: false,
    },
    address: {
      type: String,
      required: false,
    },
    country: {
      type: String,
      required: false,
      default: "Bangladesh",
    },
    city: {
      type: String,
      required: false,
    },
    shippingAddress: {
      // TODO: Should be separate collection
      type: Object,
      required: false,
    },
    isDeleted: {
      type: Boolean,
      require: true,
      default: false,
    },
    isPhoneVerify: {
      type: Boolean,
      default: false,
    },
    isEmailVerify: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.pre("save", async function () {
  const user = this;
  if (!user.password || !user.isModified("password")) {
    return;
  }
  user.password = await bcrypt.hash(
    user.password,
    Number(config.bcrypt_salt_rounds),
  );
});

// set '' after saving password
userSchema.post("save", function (doc, next) {
  doc.password = "";
  next();
});

userSchema.statics.userFindByPhone = async function (payload: string) {
  return await this.findOne({ phone: payload }).select("+password");
};

userSchema.statics.isPasswordMatched = async function (
  plainTextPassword: string,
  hashedPassword: string,
) {
  return await bcrypt.compare(plainTextPassword, hashedPassword);
};

userSchema.statics.isJWTIssuedBeforePasswordChanged = function (
  passwordChangedTimestamp: Date,
  jwtIssuedTimestamp: number,
) {
  const passwordChangedTime =
    new Date(passwordChangedTimestamp).getTime() / 1000;
  return passwordChangedTime > jwtIssuedTimestamp;
};

export const User = model<TUser, UserModel>("User", userSchema);
