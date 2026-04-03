import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert, Modal, Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/colors';
import { useLocale } from '../hooks/useLocale';
import { Locale } from '../constants/i18n';
import { userAPI } from '../services/api';

const CONTACT_EMAIL = 'zvenue176@gmail.com';
const PRIVACY_URL = 'https://jkwey.github.io/pingup-web/privacy.html';
const TERMS_URL = 'https://jkwey.github.io/pingup-web/terms.html';

const LANG_OPTIONS: { locale: Locale; label: string; flag: string }[] = [
  { locale: 'ko', label: '한국어',   flag: '🇰🇷' },
  { locale: 'en', label: 'English',  flag: '🇺🇸' },
  { locale: 'zh', label: '繁體中文', flag: '🇹🇼' },
  { locale: 'ja', label: '日本語',   flag: '🇯🇵' },
];

type Props = {
  onLogout: () => void;
  onClose: () => void;
};

export default function SettingsScreen({ onLogout, onClose }: Props) {
  const { t, locale, setLocale } = useLocale();
  const [showLangPicker, setShowLangPicker] = useState(false);

  const handleLocaleChange = async (l: Locale) => {
    setLocale(l);
    await AsyncStorage.setItem('locale', l).catch(() => {});
    setShowLangPicker(false);
  };

  const handleLogout = () => {
    Alert.alert(t('settingsLogout'), t('settingsLogoutConfirm'), [
      { text: t('nearbyCancel'), style: 'cancel' },
      {
        text: t('settingsLogout'),
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('appScreen').catch(() => {});
          onLogout();
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(t('settingsDelete'), t('settingsDeleteConfirm'), [
      { text: t('nearbyCancel'), style: 'cancel' },
      {
        text: t('settingsDelete'),
        style: 'destructive',
        onPress: async () => {
          await userAPI.deleteAccount().catch(() => {});
          await AsyncStorage.clear().catch(() => {});
          onLogout();
        },
      },
    ]);
  };

  const currentLang = LANG_OPTIONS.find((l) => l.locale === locale);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeBtn}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settingsTitle')}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.container}>
        {/* 언어 */}
        <Text style={styles.sectionLabel}>{t('settingsLanguage')}</Text>
        <TouchableOpacity style={styles.row} onPress={() => setShowLangPicker(true)}>
          <Text style={styles.rowLabel}>{t('settingsLanguage')}</Text>
          <View style={styles.rowRight}>
            <Text style={styles.rowValue}>{currentLang?.flag} {currentLang?.label}</Text>
            <Text style={styles.rowArrow}>›</Text>
          </View>
        </TouchableOpacity>

        {/* 계정 */}
        <Text style={styles.sectionLabel}>{t('settingsAccount')}</Text>
        <TouchableOpacity style={styles.row} onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}>
          <Text style={styles.rowLabel}>{t('settingsContact')}</Text>
          <Text style={styles.rowArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => Linking.openURL(PRIVACY_URL)}>
          <Text style={styles.rowLabel}>{t('settingsPrivacy')}</Text>
          <Text style={styles.rowArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => Linking.openURL(TERMS_URL)}>
          <Text style={styles.rowLabel}>{t('settingsTerms')}</Text>
          <Text style={styles.rowArrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.row} onPress={handleLogout}>
          <Text style={[styles.rowLabel, styles.danger]}>{t('settingsLogout')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={handleDeleteAccount}>
          <Text style={[styles.rowLabel, styles.danger]}>{t('settingsDelete')}</Text>
        </TouchableOpacity>

        <Text style={styles.version}>{t('settingsVersion')} 1.0.0</Text>
      </ScrollView>

      {/* 언어 선택 모달 */}
      <Modal visible={showLangPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{t('settingsLanguage')}</Text>
            {LANG_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.locale}
                style={[styles.langItem, locale === opt.locale && styles.langItemSelected]}
                onPress={() => handleLocaleChange(opt.locale)}
              >
                <Text style={styles.langFlag}>{opt.flag}</Text>
                <Text style={[styles.langLabel, locale === opt.locale && styles.langLabelSelected]}>
                  {opt.label}
                </Text>
                {locale === opt.locale && <Text style={styles.checkMark}>✓</Text>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowLangPicker(false)}>
              <Text style={styles.cancelBtnText}>{t('nearbyCancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.grayLight,
  },
  closeBtn: { color: Colors.white, fontSize: 18 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.white },
  container: { flex: 1, paddingHorizontal: 20 },
  sectionLabel: {
    color: Colors.textMuted, fontSize: 12, fontWeight: '600',
    marginTop: 28, marginBottom: 8, letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 16,
    marginBottom: 2, borderWidth: 1, borderColor: Colors.grayLight,
  },
  rowLabel: { color: Colors.white, fontSize: 15 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue: { color: Colors.textMuted, fontSize: 14 },
  rowArrow: { color: Colors.textMuted, fontSize: 18 },
  divider: { height: 1, backgroundColor: Colors.grayLight, marginVertical: 20 },
  danger: { color: '#FF4444' },
  version: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 32 },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, gap: 4,
  },
  modalTitle: {
    color: Colors.white, fontSize: 17, fontWeight: 'bold',
    textAlign: 'center', marginBottom: 16,
  },
  langItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 12,
    borderRadius: 12, gap: 12,
  },
  langItemSelected: { backgroundColor: '#2D1F3D' },
  langFlag: { fontSize: 24 },
  langLabel: { color: Colors.white, fontSize: 16, flex: 1 },
  langLabelSelected: { color: Colors.primaryLight, fontWeight: '700' },
  checkMark: { color: Colors.primary, fontSize: 18, fontWeight: 'bold' },
  cancelBtn: {
    backgroundColor: Colors.grayLight, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 12,
  },
  cancelBtnText: { color: Colors.white, fontSize: 15, fontWeight: '600' },
});
