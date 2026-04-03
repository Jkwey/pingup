import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { Colors } from '../constants/colors';
import { useLocale } from '../hooks/useLocale';
import { authAPI } from '../services/api';

type Props = {
  phone: string;
  confirmationResult: any;
  onBack: () => void;
  onVerified: (isNewUser: boolean) => void;
};

export default function VerifyScreen({ phone, confirmationResult: initialConfirmation, onBack, onVerified }: Props) {
  const { t } = useLocale();
  const [confirmation, setConfirmation] = useState(initialConfirmation);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(180); // 3분
  const [canResend, setCanResend] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);
    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      Alert.alert('오류', '6자리 인증번호를 입력해주세요');
      return;
    }
    try {
      const credential = await confirmation.confirm(fullCode);
      const idToken = await credential.user.getIdToken();
      const data = await authAPI.firebaseVerify(idToken);
      if (!data.ok) {
        const title = data.message?.includes('정지') ? '이용 정지' : '오류';
        Alert.alert(title, data.message || '인증 실패');
        return;
      }
      await AsyncStorage.setItem('token', data.token);
      onVerified(data.isNewUser);
    } catch (e: any) {
      if (e.code === 'auth/invalid-verification-code') {
        Alert.alert('오류', '인증번호가 올바르지 않습니다');
      } else {
        Alert.alert('오류', '인증에 실패했습니다');
      }
    }
  };

  const handleResend = async () => {
    try {
      const newConfirmation = await auth().signInWithPhoneNumber(phone);
      setConfirmation(newConfirmation);
      setTimer(180);
      setCanResend(false);
      setCode(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
      Alert.alert('발송 완료', '인증번호를 다시 보냈습니다');
    } catch {
      Alert.alert('오류', '재발송에 실패했습니다');
    }
  };

  const isFilled = code.every((c) => c !== '');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        {/* 뒤로가기 */}
        <TouchableOpacity style={styles.back} onPress={onBack}>
          <Text style={styles.backText}>{t('verifyBack')}</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>{t('verifyTitle')}</Text>
          <Text style={styles.sub}>{phone} {t('verifySub')}</Text>
        </View>

        {/* 코드 입력 */}
        <View style={styles.codeRow}>
          {code.map((digit, i) => (
            <TextInput
              key={i}
              ref={(el) => { inputs.current[i] = el; }}
              style={[styles.codeBox, digit ? styles.codeBoxFilled : null]}
              value={digit}
              onChangeText={(t) => handleChange(t.slice(-1), i)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              autoFocus={i === 0}
            />
          ))}
        </View>

        {/* 타이머 */}
        <View style={styles.timerRow}>
          {!canResend ? (
            <Text style={styles.timer}>
              {formatTimer(timer)} 후 재발송 가능
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResend}>
              <Text style={styles.resend}>{t('verifyResend')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 확인 버튼 */}
        <TouchableOpacity
          style={[styles.button, !isFilled && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={!isFilled}
        >
          <Text style={styles.buttonText}>{t('verifyBtn')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
  },
  back: {
    marginBottom: 40,
  },
  backText: {
    color: Colors.primaryLight,
    fontSize: 16,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  codeBox: {
    width: 48,
    height: 56,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grayLight,
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
  },
  codeBoxFilled: {
    borderColor: Colors.primary,
  },
  timerRow: {
    alignItems: 'center',
    marginBottom: 32,
  },
  timer: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  resend: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: Colors.grayLight,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
});
