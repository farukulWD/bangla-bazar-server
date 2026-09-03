import { Router } from "express";

import { addressRoutes } from "../modules/address/address.routes";
import { attributeRoutes } from "../modules/attribute/attribute.routes";
import { authRoutes } from "../modules/auth/auth.routes";
import { categoryRoutes } from "../modules/category/category.routes";
import { productRoutes } from "../modules/product/product.routes";
import { roleRoutes } from "../modules/roles/roles.routes";
import { userRoutes } from "../modules/users/user.routes";

const router = Router();

const moduleRoutes = [
  { path: "/addresses", route: addressRoutes },
  { path: "/auth", route: authRoutes },
  { path: "/attributes", route: attributeRoutes },
  { path: "/category", route: categoryRoutes },
  { path: "/products", route: productRoutes },
  { path: "/roles", route: roleRoutes },
  { path: "/users", route: userRoutes },
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
