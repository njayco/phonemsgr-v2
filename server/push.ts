import { storage } from "./storage";

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: string;
}

export async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, any>,
): Promise<boolean> {
  if (!pushToken || !pushToken.startsWith("ExponentPushToken[")) {
    return false;
  }

  try {
    const message: ExpoPushMessage = {
      to: pushToken,
      title,
      body,
      data,
      sound: "default",
    };

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      return false;
    }

    const result = await response.json();
    if (result.data?.status === "error") {
      if (result.data?.details?.error === "DeviceNotRegistered") {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>,
): Promise<boolean> {
  const token = await storage.getPushToken(userId);
  if (!token) return false;
  return sendPushNotification(token, title, body, data);
}
