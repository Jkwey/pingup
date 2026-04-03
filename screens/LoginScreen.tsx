import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { Colors } from '../constants/colors';
import { useLocale } from '../hooks/useLocale';
import { Locale } from '../constants/i18n';

const COUNTRY_CODES: Record<Locale, { flag: string; code: string; digits: number }> = {
  ko: { flag: '🇰🇷', code: '+82',  digits: 11 },
  en: { flag: '🇺🇸', code: '+1',   digits: 10 },
  zh: { flag: '🇹🇼', code: '+886', digits: 9  },
  ja: { flag: '🇯🇵', code: '+81',  digits: 11 },
};

const LANG_OPTIONS: { locale: Locale; label: string }[] = [
  { locale: 'ko', label: '한국어' },
  { locale: 'en', label: 'English' },
  { locale: 'zh', label: '繁體中文' },
  { locale: 'ja', label: '日本語' },
];

type Props = { onNext: (phone: string, confirmationResult: any) => void };

export default function LoginScreen({ onNext }: Props) {
  const { t, locale, setLocale } = useLocale();
  const [phone, setPhone] = useState('');
  const country = COUNTRY_CODES[locale];

  const handleLocaleChange = async (l: Locale) => {
    setLocale(l);
    setPhone('');
    await AsyncStorage.setItem('locale', l).catch(() => {});
  };

  const handleNext = async () => {
    const digits = phone.replace(/[^0-9]/g, '');
    if (digits.length !== country.digits) {
      Alert.alert('', locale === 'ko' ? '올바른 전화번호를 입력해주세요'
        : locale === 'en' ? 'Please enter a valid phone number'
        : locale === 'zh' ? '請輸入有效的電話號碼'
        : '有効な電話番号を入力してください');
      return;
    }
    const fullPhone = `${country.code}${phone.replace(/[^0-9]/g, '')}`;
    try {
      const confirmation = await auth().signInWithPhoneNumber(fullPhone);
      onNext(fullPhone, confirmation);
    } catch (e: any) {
      Alert.alert('오류', e.message || 'SMS 발송 실패');
    }
  };

  const isValid = phone.replace(/[^0-9]/g, '').length === country.digits;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>

        {/* 언어 선택 */}
        <View style={styles.langRow}>
          {LANG_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.locale}
              style={[styles.langBtn, locale === opt.locale && styles.langBtnActive]}
              onPress={() => handleLocaleChange(opt.locale)}
            >
              <Text style={[styles.langText, locale === opt.locale && styles.langTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 로고 */}
        <View style={styles.logoArea}>
          <Text style={styles.logoEmoji}>💘</Text>
          <Text style={styles.logoTitle}>{t('appName')}</Text>
          <Text style={styles.logoSub}>{t('appTagline')}</Text>
        </View>

        {/* 입력 */}
        <View style={styles.inputArea}>
          <Text style={styles.label}>{t('loginTitle')}</Text>
          <View style={styles.inputRow}>
            <View style={styles.countryCode}>
              <Text style={styles.countryCodeText}>{country.flag} {country.code}</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder={t('loginPlaceholder')}
              placeholderTextColor={Colors.gray}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              maxLength={15}
            />
          </View>
          <Text style={styles.hint}>{t('loginHint')}</Text>
        </View>

        {/* 버튼 */}
        <TouchableOpacity
          style={[styles.button, !isValid && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={!isValid}
        >
          <Text style={styles.buttonText}>{t('loginBtn')}</Text>
        </TouchableOpacity>

        {/* 약관 */}
        <Text style={styles.terms}>
          {t('loginTerms').split(t('loginTermsLink1'))[0]}
          <Text style={styles.termsLink}>{t('loginTermsLink1')}</Text>
          {t('loginTerms').split(t('loginTermsLink1'))[1]?.split(t('loginTermsLink2'))[0]}
          <Text style={styles.termsLink}>{t('loginTermsLink2')}</Text>
          {t('loginTerms').split(t('loginTermsLink2'))[1]}
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flex: 1, paddingHorizontal: 28, justifyContent: 'center' },

  langRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  langBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.grayLight,
  },
  langBtnActive: { borderColor: Colors.primary, backgroundColor: '#1A0D1A' },
  langText: { color: Colors.textMuted, fontSize: 13 },
  langTextActive: { color: Colors.primary, fontWeight: '700' },

  logoArea: { alignItems: 'center', marginBottom: 48 },
  logoEmoji: { fontSize: 56, marginBottom: 12 },
  logoTitle: { fontSize: 28, fontWeight: 'bold', color: Colors.white, letterSpacing: -0.5 },
  logoSub: { fontSize: 14, color: Colors.textMuted, marginTop: 6 },

  inputArea: { marginBottom: 24 },
  label: { fontSize: 16, fontWeight: '600', color: Colors.white, marginBottom: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  countryCode: {
    backgroundColor: Colors.surface, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 16,
    borderWidth: 1, borderColor: Colors.grayLight,
  },
  countryCodeText: { color: Colors.white, fontSize: 15 },
  input: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 16,
    fontSize: 17, color: Colors.white,
    borderWidth: 1, borderColor: Colors.grayLight, letterSpacing: 1,
  },
  hint: { fontSize: 12, color: Colors.textMuted, marginTop: 8, marginLeft: 4 },

  button: {
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 18, alignItems: 'center', marginBottom: 24,
  },
  buttonDisabled: { backgroundColor: Colors.grayLight },
  buttonText: { color: Colors.white, fontSize: 17, fontWeight: '700' },

  terms: { fontSize: 11, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },
  termsLink: { color: Colors.primaryLight, textDecorationLine: 'underline' },
});
