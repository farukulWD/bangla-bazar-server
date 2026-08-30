import express, { Application } from "express";
import cors from "cors";
import router from "./app/routes";
import notFound from "./app/middleware/notFound";

const app: Application = express();

app.use(cors());
app.use(express.json({ limit: "4mb" }));

app.use("/api/v1", router);

app.get("/health", async (_req, res) => {
  res.json({
    message: "OK",
  });
});

app.use(notFound);

export default app;
