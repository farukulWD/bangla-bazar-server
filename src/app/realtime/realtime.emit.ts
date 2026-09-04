import { getIOIfReady } from "../../socket";
import { TNotificationView } from "../modules/notification/notification.interface";
import { logger } from "../shared/logger";
import { NOTIFICATION_EVENT, userRoom } from "./realtime.rooms";

export const publishNotification = (
  user: string,
  view: TNotificationView,
): void => {
  const io = getIOIfReady();
  if (!io) {
    return;
  }

  try {
    io.to(userRoom(user)).emit(NOTIFICATION_EVENT, view);
  } catch (error) {
    logger.error(
      `Notification "${view.event}" could not be published: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
};
