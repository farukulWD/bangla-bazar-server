import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application } from "express";
import helmet from "helmet";
import config from "./app/config";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import notFound from "./app/middleware/notFound";
import { globalLimiter } from "./app/middleware/rateLimit";
import router from "./app/routes";

const app: Application = express();

app.use(helmet());

app.use(cors({ origin: config.client_url, credentials: true }));
app.use(express.json({ limit: "4mb" }));
app.use(cookieParser());
app.use(globalLimiter);

app.use("/api/v1", router);

app.get("/health", async (_req, res) => {
  res.json({
    message: "OK",
  });
});

app.use(notFound);
app.use(globalErrorHandler);

export default app;
