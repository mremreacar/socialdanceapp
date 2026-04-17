import * as Notifications from 'expo-notifications';
import { storage } from './storage';

export async function areUserNotificationsEnabled(): Promise<boolean> {
  return storage.getNotificationsEnabled();
}

/** Kullanıcı ayarlardan kapattıysa zamanlanmış yerel hatırlatıcıları iptal eder. */
export async function cancelAllScheduledLocalNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    /* ignore */
  }
}

/** Uygulama açıkken gelen bildirimlerin nasıl gösterileceğini ayarlar (bildirim izni kullanımı). */
export function setupNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/** İzin verildikten hemen sonra bildirimi kullanır: hoş geldin bildirimi (birkaç saniye sonra). */
export async function scheduleWelcomeNotification(): Promise<string | null> {
  try {
    if (!(await areUserNotificationsEnabled())) return null;
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return null;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Hoş geldin!',
        body: 'Çevrendeki dans etkinliklerini keşfetmeye başla.',
        data: { type: 'welcome' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
        repeats: false,
      },
    });
    return id;
  } catch {
    return null;
  }
}

/** Etkinlikten 1 saat önce hatırlatıcı bildirimi zamanlar (bildirimler gerçekten kullanılır). */
export async function scheduleEventReminder(
  eventTitle: string,
  eventDate: Date
): Promise<string | null> {
  try {
    if (!(await areUserNotificationsEnabled())) return null;
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return null;
    const triggerDate = new Date(eventDate.getTime() - 60 * 60 * 1000);
    if (triggerDate.getTime() <= Date.now()) return null;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Etkinlik hatırlatıcısı',
        body: `${eventTitle} 1 saat sonra başlıyor.`,
        data: { eventTitle },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
    return id;
  } catch {
    return null;
  }
}
