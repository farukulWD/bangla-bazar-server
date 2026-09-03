import { Router } from "express";

import checkAuth from "../../middleware/checkAuth";
import validateRequest from "../../middleware/validateRequest";
import { addressController } from "./address.controller";
import { addressValidation } from "./address.validation";

const router = Router();

router.get("/", checkAuth, addressController.getMyAddresses);

router.post(
  "/",
  checkAuth,
  validateRequest(addressValidation.createAddressValidationSchema),
  addressController.createAddress,
);

router.patch(
  "/:id",
  checkAuth,
  validateRequest(addressValidation.updateAddressValidationSchema),
  addressController.updateAddress,
);

router.delete("/:id", checkAuth, addressController.deleteAddress);

export const addressRoutes = router;
