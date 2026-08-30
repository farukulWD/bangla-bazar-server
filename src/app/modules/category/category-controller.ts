import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { ICategory } from "./category.interface";
import { categoryServices } from "./category.services";

const addCategory = catchAsync(async (req: Request, res: Response) => {
  const categoryData: ICategory = req.body;
  const file = req.file;
  const category = await categoryServices.addCategoryToDB(categoryData, file);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Category created successfully",
    data: category,
  });
});

export const categoryController = {
  addCategory,
};
