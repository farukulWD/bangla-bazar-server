import { Router } from "express";

import { addressRoutes } from "../modules/address/address.routes";
import { attributeRoutes } from "../modules/attribute/attribute.routes";
import { authRoutes } from "../modules/auth/auth.routes";
import { cartRoutes } from "../modules/cart/cart.routes";
import { categoryRoutes } from "../modules/category/category.routes";
import { couponRoutes } from "../modules/coupon/coupon.routes";
import { currencyRoutes } from "../modules/currency/currency.routes";
import { notificationRoutes } from "../modules/notification/notification.routes";
import { orderRoutes } from "../modules/order/order.routes";
import { paymentRoutes } from "../modules/payment/payment.routes";
import { productRoutes } from "../modules/product/product.routes";
import { roleRoutes } from "../modules/roles/roles.routes";
import { settingsRoutes } from "../modules/settings/settings.routes";
import { userRoutes } from "../modules/users/user.routes";

const router = Router();

const moduleRoutes = [
  { path: "/addresses", route: addressRoutes },
  { path: "/auth", route: authRoutes },
  { path: "/attributes", route: attributeRoutes },
  { path: "/carts", route: cartRoutes },
  { path: "/category", route: categoryRoutes },
  { path: "/coupons", route: couponRoutes },
  { path: "/currencies", route: currencyRoutes },
  { path: "/notifications", route: notificationRoutes },
  { path: "/orders", route: orderRoutes },
  { path: "/payments", route: paymentRoutes },
  { path: "/products", route: productRoutes },
  { path: "/roles", route: roleRoutes },
  { path: "/settings", route: settingsRoutes },
  { path: "/users", route: userRoutes },
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
