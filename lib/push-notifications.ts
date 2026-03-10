import { Platform } from 'react-native';
import { apiRequest } from '@/lib/query-client';

let Notifications: any = null;

async function loadNotifications() {
  if (Platform.OS === 'web') return null;
  if (!Notifications) {
    try {
      Notifications = await import('expo-notifications');
    } catch {
      return null;
    }
  }
  return Notifications;
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const notifs = await loadNotifications();
  if (!notifs) return null;

  try {
    const { status: existingStatus } = await notifs.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await notifs.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    const tokenData = await notifs.getExpoPushTokenAsync();
    const token = tokenData.data;

    await apiRequest('POST', '/api/push-token', { token });

    return token;
  } catch {
    return null;
  }
}

export async function unregisterPushNotifications(): Promise<void> {
  try {
    await apiRequest('POST', '/api/push-token', { token: null });
  } catch {}
}

export async function setupNotificationListeners(onNotificationTap?: (data: any) => void) {
  if (Platform.OS === 'web') return;

  const notifs = await loadNotifications();
  if (!notifs) return;

  notifs.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  const responseSubscription = notifs.addNotificationResponseReceivedListener((response: any) => {
    const data = response.notification.request.content.data;
    if (onNotificationTap) {
      onNotificationTap(data);
    }
  });

  return () => {
    responseSubscription.remove();
  };
}
