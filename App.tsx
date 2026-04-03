import { useState, useEffect, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestLocationPermission } from './services/location';
import { requestNotificationPermission } from './services/notifications';
import { LocaleContext, detectLocale } from './hooks/useLocale';
import { translations, Locale, TranslationKey } from './constants/i18n';
import LoginScreen from './screens/LoginScreen';
import VerifyScreen from './screens/VerifyScreen';
import ProfileSetupScreen from './screens/ProfileSetupScreen';
import MainTabs from './navigation/MainTabs';
import { Colors } from './constants/colors';

type Screen = 'login' | 'verify' | 'profileSetup' | 'home';

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [phone, setPhone] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [locale, setLocale] = useState<Locale>(detectLocale());

  const localeValue = useMemo(() => ({
    locale,
    setLocale,
    t: (key: TranslationKey) => translations[locale][key] ?? translations.ko[key],
  }), [locale]);

  useEffect(() => {
    const init = async () => {
      try {
        await Promise.race([
          (async () => {
            await requestNotificationPermission();
            await requestLocationPermission();
          })(),
          new Promise((_, reject) => setTimeout(() => reject('timeout'), 3000)),
        ]);
      } catch {}
      try {
        const [saved, savedLocale] = await Promise.all([
          AsyncStorage.getItem('appScreen'),
          AsyncStorage.getItem('locale'),
        ]);
        if (saved === 'home') setScreen('home');
        if (savedLocale) setLocale(savedLocale as Locale);
      } catch {}
      setLoading(false);
    };
    init();
  }, []);

  const goTo = async (next: Screen) => {
    setScreen(next);
    if (next === 'home') await AsyncStorage.setItem('appScreen', 'home').catch(() => {});
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <LocaleContext.Provider value={localeValue}>
      <NavigationContainer>
        <StatusBar style="light" />
        {screen === 'login' && (
          <LoginScreen onNext={(p, cr) => { setPhone(p); setConfirmationResult(cr); goTo('verify'); }} />
        )}
        {screen === 'verify' && (
          <VerifyScreen
            phone={phone}
            confirmationResult={confirmationResult}
            onBack={() => setScreen('login')}
            onVerified={(isNewUser) => goTo(isNewUser ? 'profileSetup' : 'home')}
          />
        )}
        {screen === 'profileSetup' && (
          <ProfileSetupScreen onComplete={() => goTo('home')} />
        )}
        {screen === 'home' && <MainTabs onLogout={() => setScreen('login')} />}
      </NavigationContainer>
    </LocaleContext.Provider>
  );
}
