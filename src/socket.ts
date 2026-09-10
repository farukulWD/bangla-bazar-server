import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";

import config from "./app/config";
import { authUserFromToken } from "./app/modules/auth/auth.verify";
import { STAFF_USER_TYPES, UserType } from "./app/modules/users/user.interface";
import { STAFF_ROOM, userRoom } from "./app/realtime/realtime.rooms";
import { logger } from "./app/shared/logger";

type TSocketData = { userId: string; userType: UserType };

let io: Server | undefined;

const readToken = (socket: Socket): string => {
  const token: unknown = socket.handshake.auth?.token;
  return typeof token === "string" ? token.trim() : "";
};

const authenticate = async (
  socket: Socket,
  next: (err?: Error) => void,
): Promise<void> => {
  const token = readToken(socket);
  if (!token) {
    return next(new Error("Authentication required"));
  }

  try {
    const user = await authUserFromToken(token);
    const data: TSocketData = {
      userId: user._id.toString(),
      userType: user.userType,
    };
    socket.data = data;
    next();
  } catch (error) {
    next(new Error(error instanceof Error ? error.message : "Not authorised"));
  }
};

const joinRooms = (socket: Socket): void => {
  const { userId, userType } = socket.data as TSocketData;

  void socket.join(userRoom(userId));

  if (STAFF_USER_TYPES.includes(userType)) {
    void socket.join(STAFF_ROOM);
  }
};

export const initializeSocketIO = (server: HttpServer): void => {
  try {
    io = new Server(server, {
      pingTimeout: 60000,
      cors: { origin: config.client_urls, credentials: true },
    });

    io.use((socket, next) => {
      void authenticate(socket, next);
    });

    io.on("connection", joinRooms);

    logger.info("socket initialized");
  } catch (error) {
    logger.error(
      `socket failed to initialize: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
};

export const getIOIfReady = (): Server | undefined => io;

export const closeSocketIO = async (): Promise<void> => {
  if (!io) {
    return;
  }
  await io.close();
  io = undefined;
};
