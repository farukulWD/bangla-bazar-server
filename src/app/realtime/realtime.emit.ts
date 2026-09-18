import { getIOIfReady } from "../../socket";
import { TNotificationView } from "../modules/notification/notification.interface";
import { logger } from "../shared/logger";
import { NOTIFICATION_EVENT, SETTINGS_EVENT, userRoom } from "./realtime.rooms";

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

export const publishSettingsUpdate = (publicSettings: unknown): void => {
  const io = getIOIfReady();
  if (!io) {
    return;
  }

  try {
    io.emit(SETTINGS_EVENT, publicSettings);
  } catch (error) {
    logger.error(
      `Settings update could not be published: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
};
