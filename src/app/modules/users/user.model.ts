import config from "../../config";
import { model, Schema } from "mongoose";
import bcrypt from "bcrypt";
import { TUser, UserModel, UserType } from "./user.interface";

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
      sparse: true,
    },
    phone: {
      type: String,
      required: false,
      sparse: true,
      unique: true,
    },
    role: {
      type: Schema.Types.ObjectId,
      ref: "Role",
      default: null,
    },
    userType: {
      type: String,
      enum: Object.values(UserType),
      default: UserType.Customer,
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

userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ isDeleted: 1, createdAt: -1 });
userSchema.index({ isDeleted: 1, name: 1 });

userSchema.pre("save", async function () {
  const user = this;
  // Registration verifies the code long after the password was bcrypted into the
  // pending record — hashing again here would make it unmatchable.
  if (user.$locals.skipPasswordHash) {
    return;
  }
  if (!user.password || !user.isModified("password")) {
    return;
  }
  user.password = await bcrypt.hash(
    user.password,
    Number(config.bcrypt_salt_rounds),
  );
  if (!this.isNew) {
    this.passwordChangedAt = new Date(Date.now() - 1000);
  }
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
