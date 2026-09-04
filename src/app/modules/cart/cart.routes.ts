import { Router } from "express";

import checkAuth from "../../middleware/checkAuth";
import validateRequest from "../../middleware/validateRequest";
import { cartController } from "./cart.controller";
import { cartValidation } from "./cart.validation";

const router = Router();

router.get("/", checkAuth, cartController.getCart);

router.post(
  "/merge",
  checkAuth,
  validateRequest(cartValidation.mergeCartValidationSchema),
  cartController.mergeCart,
);

router.put(
  "/items",
  checkAuth,
  validateRequest(cartValidation.setCartItemValidationSchema),
  cartController.setCartItem,
);

router.delete(
  "/items/:lineId",
  checkAuth,
  validateRequest(cartValidation.lineParamValidationSchema),
  cartController.removeCartItem,
);

router.delete("/", checkAuth, cartController.clearCart);

export const cartRoutes: Router = router;
