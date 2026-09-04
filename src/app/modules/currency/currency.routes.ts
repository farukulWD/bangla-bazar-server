import { Router } from "express";

import {
  CurrencyPermission,
  PermissionModule,
} from "../../constants/permissions";
import checkAuth from "../../middleware/checkAuth";
import checkPermission from "../../middleware/checkPermission";
import validateRequest from "../../middleware/validateRequest";
import { currencyController } from "./currency.controller";
import { currencyValidation } from "./currency.validation";

const router = Router();

const can = (permission: CurrencyPermission) =>
  checkPermission(PermissionModule.Currency, permission);

// Declared before "/:id" so the literal segment is not read as an id.
router.get("/active", currencyController.getActiveCurrencies);

router.get(
  "/",
  checkAuth,
  can(CurrencyPermission.ViewCurrencies),
  currencyController.getCurrencies,
);

router.post(
  "/",
  checkAuth,
  can(CurrencyPermission.AddCurrency),
  validateRequest(currencyValidation.createCurrencyValidationSchema),
  currencyController.createCurrency,
);

router.get(
  "/:id",
  checkAuth,
  can(CurrencyPermission.ViewCurrencies),
  validateRequest(currencyValidation.idParamValidationSchema),
  currencyController.getCurrencyById,
);

router.patch(
  "/:id/rate",
  checkAuth,
  can(CurrencyPermission.EditCurrency),
  validateRequest(currencyValidation.updateRateValidationSchema),
  currencyController.updateCurrencyRate,
);

router.patch(
  "/:id/status",
  checkAuth,
  can(CurrencyPermission.PublishCurrency),
  validateRequest(currencyValidation.updateStatusValidationSchema),
  currencyController.updateCurrencyStatus,
);

router.patch(
  "/:id/base",
  checkAuth,
  can(CurrencyPermission.SetBaseCurrency),
  validateRequest(currencyValidation.idParamValidationSchema),
  currencyController.setBaseCurrency,
);

router.patch(
  "/:id",
  checkAuth,
  can(CurrencyPermission.EditCurrency),
  validateRequest(currencyValidation.updateCurrencyValidationSchema),
  currencyController.updateCurrency,
);

router.delete(
  "/:id",
  checkAuth,
  can(CurrencyPermission.DeleteCurrency),
  validateRequest(currencyValidation.idParamValidationSchema),
  currencyController.deleteCurrency,
);

export const currencyRoutes: Router = router;
