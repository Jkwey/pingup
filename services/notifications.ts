import * as Notifications from 'expo-notifications';

// 푸시 알림 권한 요청
export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// 핑 수신 알림
export async function showPingNotification(delayedMode: boolean) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '💘 핑업 아티스트',
      body: delayedMode
        ? '방금 스쳐간 누군가가 관심을 보냈어요'
        : '누군가 당신에게 핑을 보냈어요',
      sound: true,
    },
    trigger: null, // 즉시 발송
  });
}

// 매칭 성사 알림
export async function showMatchNotification() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '💘 매칭 성사!',
      body: '상대방이 핑을 수락했어요. 지금 대화를 시작해보세요!',
      sound: true,
    },
    trigger: null,
  });
}

// 멀어진 후 알림 (delayedMode) — 실제로는 서버에서 FCM으로 발송
// 앱 내에서 시뮬레이션용
export async function scheduleDelayedPingNotification(delaySeconds: number = 5) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '💘 핑업 아티스트',
      body: '방금 스쳐간 누군가가 당신을 돌아봤어요',
      sound: true,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: delaySeconds },
  });
}
