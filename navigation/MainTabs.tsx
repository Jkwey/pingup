import React, { useState, useEffect, useRef } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import ChatScreen from '../screens/ChatScreen';
import MyProfileScreen from '../screens/MyProfileScreen';
import SendPingScreen from '../screens/SendPingScreen';
import { Colors } from '../constants/colors';
import { useLocale } from '../hooks/useLocale';
import { userAPI } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import * as Notifications from 'expo-notifications';

const Tab = createBottomTabNavigator();

type Props = { onLogout: () => void };

export default function MainTabs({ onLogout }: Props) {
  const { t } = useLocale();
  const [hearts, setHearts] = useState(3);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pingBadge, setPingBadge] = useState(0);

  useEffect(() => {
    userAPI.getMe().then(async (res) => {
      if (!res.ok || !res.user) return;
      setCurrentUser(res.user);
      setHearts(res.user.hearts ?? 3);

      const socket = connectSocket(res.user.id);
      socket.on('ping_accepted', () => {
        Notifications.scheduleNotificationAsync({
          content: { title: '💘 매칭 성사!', body: '상대방이 핑을 수락했어요!', sound: true },
          trigger: null,
        });
        setPingBadge((b) => b + 1);
      });

      // Expo Push Token 저장 (EAS projectId 설정 후 동작)
      try {
        const Constants = require('expo-constants').default;
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        if (projectId && projectId !== 'YOUR_EAS_PROJECT_ID') {
          const t = await Notifications.getExpoPushTokenAsync({ projectId });
          userAPI.savePushToken(t.data).catch(() => {});
        }
      } catch {}
    });

    return () => { disconnectSocket(); };
  }, []);

  const spendHeart = () => setHearts((h) => Math.max(0, h - 1));
  const addHearts = (amount: number) => setHearts((h) => h + amount);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.grayLight,
          borderTopWidth: 1,
          paddingBottom: 10,
          paddingTop: 8,
          height: 68,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.gray,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tab.Screen
        name="Home"
        options={{
          tabBarLabel: t('homeReceived'),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>💘</Text>,
          tabBarBadge: pingBadge > 0 ? pingBadge : undefined,
        }}
      >
        {() => <HomeScreen hearts={hearts} currentUser={currentUser} onPingRead={() => setPingBadge(0)} />}
      </Tab.Screen>
      <Tab.Screen
        name="Nearby"
        options={{
          tabBarLabel: t('homeNearby'),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>📡</Text>,
        }}
      >
        {() => (
          <SendPingScreen
            myPoints={hearts}
            onPointSpent={spendHeart}
            currentUser={currentUser}
          />
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Chat"
        options={{
          tabBarLabel: t('homeChat'),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>💬</Text>,
        }}
      >
        {() => (
          <ChatScreen
            myUserId={currentUser?.id}
            myHobbies={currentUser?.hobbies || []}
          />
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Profile"
        options={{
          tabBarLabel: t('homeProfile'),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>👤</Text>,
        }}
      >
        {() => (
          <MyProfileScreen
            hearts={hearts}
            onHeartsAdded={addHearts}
            onLogout={onLogout}
            currentUser={currentUser}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
