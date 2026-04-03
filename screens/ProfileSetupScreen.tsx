import React, { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert, SafeAreaView,
} from 'react-native';
import { Colors } from '../constants/colors';
import { filterNickname, filterBio } from '../utils/filter';
import { useLocale } from '../hooks/useLocale';
import { userAPI } from '../services/api';
import {
  HOBBY_CATEGORIES, JOB_OPTIONS, SMOKING_OPTIONS,
  DRINKING_OPTIONS, GENDER_OPTIONS, INTEREST_GENDER_OPTIONS,
  getHobbyItems, getCategoryName,
} from '../constants/options';

type InitialData = {
  nickname?: string;
  height?: number;
  birthYear?: number;
  gender?: string;
  interestGender?: string;
  job?: string;
  smoking?: string;
  drinking?: string;
  hobbies?: string[];
  bio?: string;
  photoUrl?: string;
};

type Props = {
  onComplete: () => void;
  onBack?: () => void;
  initialData?: InitialData;
};

export default function ProfileSetupScreen({ onComplete, onBack, initialData }: Props) {
  const { t, locale } = useLocale();
  const [nickname, setNickname] = useState(initialData?.nickname || '');
  const [height, setHeight] = useState(initialData?.height ? String(initialData.height) : '');
  const [birthYear, setBirthYear] = useState(initialData?.birthYear ? String(initialData.birthYear) : '');
  const [gender, setGender] = useState(initialData?.gender || '');
  const [interestGender, setInterestGender] = useState(initialData?.interestGender || '');
  const [job, setJob] = useState(initialData?.job || '');
  const [smoking, setSmoking] = useState(initialData?.smoking || '');
  const [drinking, setDrinking] = useState(initialData?.drinking || '');
  const [hobbies, setHobbies] = useState<string[]>(initialData?.hobbies || []);
  const [bio, setBio] = useState(initialData?.bio || '');
  const [photo, setPhoto] = useState<string | null>(initialData?.photoUrl || null);

  useEffect(() => {
    ImagePicker.requestMediaLibraryPermissionsAsync();
    ImagePicker.requestCameraPermissionsAsync();
  }, []);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handlePhotoPress = () => {
    Alert.alert('사진 추가', '얼굴이 잘 보이는 사진을 선택해주세요', [
      { text: '카메라로 찍기', onPress: takePhoto },
      { text: '갤러리에서 선택', onPress: pickPhoto },
      { text: '취소', style: 'cancel' },
    ]);
  };

  const toggleHobby = (hobby: string) => {
    if (hobbies.includes(hobby)) {
      setHobbies(hobbies.filter((h) => h !== hobby));
    } else {
      if (hobbies.length >= 10) {
        Alert.alert('최대 10개까지 선택 가능합니다');
        return;
      }
      setHobbies([...hobbies, hobby]);
    }
  };

  const handleComplete = async () => {
    if (!photo) { Alert.alert(t('profilePhoto')); return; }
    if (!nickname.trim()) { Alert.alert(t('profileNickname')); return; }

    const nicknameCheck = filterNickname(nickname);
    if (!nicknameCheck.ok) { Alert.alert(nicknameCheck.reason); return; }

    if (bio) {
      const bioCheck = filterBio(bio);
      if (!bioCheck.ok) { Alert.alert(bioCheck.reason); return; }
    }

    if (!height) { Alert.alert(t('profileHeight')); return; }
    if (!birthYear) { Alert.alert(t('profileBirthYear')); return; }
    const currentYear = new Date().getFullYear();
    const age = currentYear - Number(birthYear);
    if (age < 18 || age > 80) { Alert.alert('나이 확인', '만 18세 이상만 이용 가능합니다'); return; }
    if (!gender) { Alert.alert(t('profileGender')); return; }
    if (!interestGender) { Alert.alert(t('profileInterest')); return; }
    if (!job) { Alert.alert(t('profileJob')); return; }
    if (!smoking) { Alert.alert(t('profileSmoking')); return; }
    if (!drinking) { Alert.alert(t('profileDrinking')); return; }
    if (hobbies.length < 2) { Alert.alert(t('profileHobbies')); return; }

    try {
      // 1. 사진 업로드
      let photoUrl: string | undefined;
      const photoResult = await userAPI.uploadPhoto(photo);
      if (photoResult.ok) photoUrl = photoResult.photoUrl;

      // 2. 프로필 저장
      await userAPI.saveProfile({
        nickname, height: Number(height), gender, interestGender,
        job, smoking, drinking, hobbies, bio, photoUrl, locale,
        birthYear: Number(birthYear),
      });

      onComplete();
    } catch {
      Alert.alert('오류', '프로필 저장에 실패했습니다');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* 헤더 */}
        <View style={styles.header}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Text style={styles.backBtnText}>←</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.title}>{t('profileTitle')}</Text>
          <Text style={styles.sub}>{t('profileSub')}</Text>
        </View>

        <Section title={t('profilePhoto')} required>
          <TouchableOpacity style={styles.photoBox} onPress={handlePhotoPress}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.photoPreview} />
            ) : (
              <>
                <Text style={styles.photoIcon}>📷</Text>
                <Text style={styles.photoText}>{t('profilePhotoBtn')}</Text>
                <Text style={styles.photoHint}>{t('profilePhotoHint')}</Text>
              </>
            )}
          </TouchableOpacity>
          {photo && (
            <TouchableOpacity onPress={handlePhotoPress} style={styles.photoChange}>
              <Text style={styles.photoChangeText}>{t('profilePhotoChange')}</Text>
            </TouchableOpacity>
          )}
        </Section>

        <Section title={t('profileNickname')} required>
          <TextInput
            style={styles.textInput}
            placeholder={t('profileNickname')}
            placeholderTextColor={Colors.gray}
            value={nickname}
            onChangeText={(v) => setNickname(v.slice(0, 10))}
            maxLength={10}
          />
          <Text style={styles.charCount}>{nickname.length}/10</Text>
        </Section>

        <Section title={t('profileHeight')} required>
          <View style={styles.row}>
            <TextInput
              style={[styles.textInput, { flex: 1 }]}
              placeholder="175"
              placeholderTextColor={Colors.gray}
              value={height}
              onChangeText={(v) => setHeight(v.replace(/[^0-9]/g, '').slice(0, 3))}
              keyboardType="number-pad"
              maxLength={3}
            />
            <Text style={styles.unit}>cm</Text>
          </View>
        </Section>

        <Section title={t('profileBirthYear')} required>
          <View style={styles.row}>
            <TextInput
              style={[styles.textInput, { flex: 1 }]}
              placeholder="1995"
              placeholderTextColor={Colors.gray}
              value={birthYear}
              onChangeText={(v) => setBirthYear(v.replace(/[^0-9]/g, '').slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
            />
            <Text style={styles.unit}>{t('ageSuffix') || 'yr'}</Text>
          </View>
        </Section>

        <Section title={t('profileGender')} required>
          <View style={styles.chips}>
            {GENDER_OPTIONS.map((opt) => (
              <Chip key={opt.value} label={t(opt.labelKey)}
                selected={gender === opt.value} onPress={() => setGender(opt.value)} />
            ))}
          </View>
        </Section>

        <Section title={t('profileInterest')} required>
          <View style={styles.chips}>
            {INTEREST_GENDER_OPTIONS.map((opt) => (
              <Chip key={opt.value} label={t(opt.labelKey)}
                selected={interestGender === opt.value} onPress={() => setInterestGender(opt.value)} />
            ))}
          </View>
        </Section>

        <Section title={t('profileJob')} required>
          <View style={styles.chips}>
            {JOB_OPTIONS.map((opt) => (
              <Chip key={opt.value} label={t(opt.labelKey)}
                selected={job === opt.value} onPress={() => setJob(opt.value)} />
            ))}
          </View>
        </Section>

        <Section title={t('profileSmoking')} required hint={t('profileMatchHint')}>
          <View style={styles.chips}>
            {SMOKING_OPTIONS.map((opt) => (
              <Chip key={opt.value} label={t(opt.labelKey)}
                selected={smoking === opt.value} onPress={() => setSmoking(opt.value)} />
            ))}
          </View>
        </Section>

        <Section title={t('profileDrinking')} required hint={t('profileMatchHint')}>
          <View style={styles.chips}>
            {DRINKING_OPTIONS.map((opt) => (
              <Chip key={opt.value} label={t(opt.labelKey)}
                selected={drinking === opt.value} onPress={() => setDrinking(opt.value)} />
            ))}
          </View>
        </Section>

        <Section title={`${t('profileHobbies')} (${hobbies.length}/10)`} required hint={t('profileHobbyHint')}>
          {HOBBY_CATEGORIES.map((cat) => {
            const displayItems = getHobbyItems(cat, locale);
            return (
              <View key={cat.categoryKey} style={styles.hobbyCategory}>
                <Text style={styles.hobbyCategoryTitle}>
                  {getCategoryName(cat, locale)}
                </Text>
                <View style={styles.chips}>
                  {cat.items.map((item, idx) => (
                    <Chip key={item} label={displayItems[idx]}
                      selected={hobbies.includes(item)} onPress={() => toggleHobby(item)} highlight />
                  ))}
                </View>
              </View>
            );
          })}
        </Section>

        <Section title={t('profileBio')}>
          <TextInput
            style={[styles.textInput, styles.bioInput]}
            placeholder={t('profileBio')}
            placeholderTextColor={Colors.gray}
            value={bio}
            onChangeText={(v) => setBio(v.slice(0, 30))}
            maxLength={30}
            multiline
          />
          <Text style={styles.charCount}>{bio.length}/30</Text>
        </Section>

        <TouchableOpacity style={styles.button} onPress={handleComplete}>
          <Text style={styles.buttonText}>{t('profileComplete')}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// 섹션 컴포넌트
function Section({
  title, required, hint, children,
}: {
  title: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {title}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
        {hint && <Text style={styles.sectionHint}>{hint}</Text>}
      </View>
      {children}
    </View>
  );
}

// 칩 컴포넌트
function Chip({
  label, selected, onPress, highlight,
}: {
  label: string; selected: boolean; onPress: () => void; highlight?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        selected && (highlight ? styles.chipSelectedHighlight : styles.chipSelected),
      ]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, paddingHorizontal: 20 },
  header: { paddingTop: 20, marginBottom: 8 },
  backBtn: { marginBottom: 8 },
  backBtnText: { color: Colors.primaryLight, fontSize: 22 },
  title: { fontSize: 26, fontWeight: 'bold', color: Colors.white },
  sub: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },

  section: { marginTop: 28 },
  sectionHeader: { marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.white },
  sectionHint: { fontSize: 11, color: Colors.primary, marginTop: 3 },
  required: { color: Colors.primary },

  photoBox: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.grayLight,
    borderStyle: 'dashed',
    alignItems: 'center',
    paddingVertical: 32,
  },
  photoPreview: { width: '100%', height: 200, borderRadius: 14 },
  photoChange: { alignItems: 'center', marginTop: 8 },
  photoChangeText: { color: Colors.primaryLight, fontSize: 13 },
  photoIcon: { fontSize: 40, marginBottom: 8 },
  photoText: { color: Colors.white, fontSize: 15, fontWeight: '500' },
  photoHint: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },

  textInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.white,
    borderWidth: 1,
    borderColor: Colors.grayLight,
  },
  bioInput: { height: 80, textAlignVertical: 'top' },
  charCount: { color: Colors.textMuted, fontSize: 12, textAlign: 'right', marginTop: 4 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  unit: { color: Colors.white, fontSize: 16 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.grayLight,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipSelectedHighlight: {
    backgroundColor: '#2D1F3D',
    borderColor: Colors.primaryLight,
  },
  chipText: { color: Colors.textMuted, fontSize: 14 },
  chipTextSelected: { color: Colors.white, fontWeight: '600' },

  hobbyCategory: { marginBottom: 16 },
  hobbyCategoryTitle: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.5,
  },

  button: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonText: { color: Colors.white, fontSize: 17, fontWeight: '700' },
});
