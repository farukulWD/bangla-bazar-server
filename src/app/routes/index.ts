import { Router } from "express";

// Legacy CommonJS route modules. These stay untyped (`any`) until each one is
// converted and moved under src/.
import productRoutes from "../../../routes/productRoutes";
import customerRoutes from "../../../routes/customerRoutes";
import adminRoutes from "../../../routes/adminRoutes";
import orderRoutes from "../../../routes/orderRoutes";
import customerOrderRoutes from "../../../routes/customerOrderRoutes";
import categoryRoutes from "../../../routes/categoryRoutes";
import couponRoutes from "../../../routes/couponRoutes";
import attributeRoutes from "../../../routes/attributeRoutes";
import settingRoutes from "../../../routes/settingRoutes";
import currencyRoutes from "../../../routes/currencyRoutes";
import languageRoutes from "../../../routes/languageRoutes";
import notificationRoutes from "../../../routes/notificationRoutes";

const router = Router();

const moduleRoutes = [
  { path: "/products", route: productRoutes },
  { path: "/customer", route: customerRoutes },
  { path: "/category", route: categoryRoutes },
  { path: "/coupon", route: couponRoutes },
  { path: "/order", route: customerOrderRoutes },
  { path: "/admin/order", route: orderRoutes },
  { path: "/admin", route: adminRoutes },
  { path: "/attributes", route: attributeRoutes },
  { path: "/setting", route: settingRoutes },
  { path: "/currency", route: currencyRoutes },
  { path: "/language", route: languageRoutes },
  { path: "/notification", route: notificationRoutes },
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
