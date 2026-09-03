import { Router } from "express";

import { authRoutes } from "../modules/auth/auth.routes";
import { categoryRoutes } from "../modules/category/category.routes";
import { roleRoutes } from "../modules/roles/roles.routes";
import { userRoutes } from "../modules/users/user.routes";

const router = Router();

const moduleRoutes = [
  { path: "/auth", route: authRoutes },
  { path: "/category", route: categoryRoutes },
  { path: "/roles", route: roleRoutes },
  { path: "/users", route: userRoutes },
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
