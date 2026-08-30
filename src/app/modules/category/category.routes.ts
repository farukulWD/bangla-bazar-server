import { NextFunction, Router, Request, Response } from "express";
import { categoryController } from "./category-controller";
import { upload } from "../../utils/sendImageToCloudinary";
import validateRequest from "../../middleware/validateRequest";
import { categoryValidation } from "./category.validaton";

const router = Router();

const parseFormData = (req: Request, res: Response, next: NextFunction) => {
  if (req.body.data) {
    req.body = JSON.parse(req.body.data);
  }
  next();
};

router.post(
  "/create",
  upload.single("icon"),
  parseFormData,
  validateRequest(categoryValidation.createCategoryValidationSchema),
  categoryController.addCategory,
);

export const categoryRoutes: Router = router;
