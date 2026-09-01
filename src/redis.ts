import config from "./app/config";
import { Redis } from "ioredis";

const redisClient = new Redis(config.redis_url || "redis://localhost:6379");

redisClient.on("error", (err) => console.error("Redis Client Error", err));
redisClient.on("connect", () => console.log("Redis connected"));

export default redisClient;
