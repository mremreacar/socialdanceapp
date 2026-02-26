import * as Notifications from 'expo-notifications';

/** Uygulama açıkken gelen bildirimlerin nasıl gösterileceğini ayarlar (bildirim izni kullanımı). */
export function setupNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/** İzin verildikten hemen sonra bildirimi kullanır: hoş geldin bildirimi (birkaç saniye sonra). */
export async function scheduleWelcomeNotification(): Promise<string | null> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return null;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Hoş geldin!',
        body: 'Çevrendeki dans etkinliklerini keşfetmeye başla.',
        data: { type: 'welcome' },
      },
      trigger: { seconds: 5 },
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
      trigger: triggerDate,
    });
    return id;
  } catch {
    return null;
  }
}
