import AppError from "../../errors/AppError";
import { ICategory } from "./category.interface";
import httpStatus from "http-status";
import { Category } from "./category.model";
import { sendImageToCloudinary } from "../../utils/sendImageToCloudinary";

const uploadIcon = async (file: Express.Multer.File) => {
  const uploadResult = await sendImageToCloudinary(
    `category-icon-${Date.now()}`,
    file.path,
    file.mimetype,
  );
  return uploadResult.secure_url as string;
};

const addCategoryToDB = async (
  categoryData: ICategory,
  file?: Express.Multer.File,
) => {
  if (!categoryData.name) {
    throw new AppError(httpStatus.BAD_REQUEST, "Category name is required");
  }
  if (!categoryData.slug) {
    categoryData.slug = categoryData.name.toLowerCase().replace(/\s+/g, "-");
  }
  if (file) {
    categoryData.icon = await uploadIcon(file);
  }
  const category = new Category(categoryData);
  await category.save();
  return category;
};

export const categoryServices = { addCategoryToDB };
