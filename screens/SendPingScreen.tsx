import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, Modal, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Colors } from '../constants/colors';
import { useLocale } from '../hooks/useLocale';
import {
  JOB_OPTIONS, SMOKING_OPTIONS, DRINKING_OPTIONS,
  getLocalizedHobby, translateOption,
} from '../constants/options';
import * as Location from 'expo-location';
import { userAPI, pingAPI } from '../services/api';

type NearbyUser = {
  id: string;
  height: number;
  job: string;
  smoking: string;
  drinking: string;
  hobbies: string[];
  bio?: string;
  birth_year?: number;
};

type Props = {
  myPoints: number;
  onPointSpent: () => void;
  currentUser: any | null;
};

export default function SendPingScreen({ myPoints, onPointSpent, currentUser }: Props) {
  const { t, locale } = useLocale();
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<NearbyUser | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [sentIds, setSentIds] = useState<string[]>([]);

  const PING_TEMPLATES = [
    t('pingTemplate1'), t('pingTemplate2'), t('pingTemplate3'),
    t('pingTemplate4'), t('pingTemplate5'), t('pingTemplate6'),
  ];

  const fetchNearby = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;

      // 내 위치 서버에 저장
      await userAPI.updateLocation(latitude, longitude);

      // 주변 유저 가져오기
      const res = await userAPI.getNearby(latitude, longitude);
      if (res.ok) setNearbyUsers(res.users || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchNearby(); }, [fetchNearby]);

  const myHobbies: string[] = currentUser?.hobbies || [];
  const mySmoking: string = currentUser?.smoking || '';

  const handleUserPress = (user: NearbyUser) => {
    setSelectedUser(user);
    setSelectedTemplate('');
  };

  const handleSendPress = () => {
    if (!selectedTemplate) {
      Alert.alert(t('selectMessage'));
      return;
    }
    if (myPoints < 1) {
      Alert.alert(t('noHeartsTitle'), t('noHeartsBody'));
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    if (!selectedUser) return;
    try {
      const res = await pingAPI.send(selectedUser.id, selectedTemplate);
      if (!res.ok) {
        Alert.alert('오류', res.message || '핑 전송 실패');
        setShowConfirm(false);
        return;
      }
      setSentIds((prev) => [...prev, selectedUser.id]);
      onPointSpent();
      setShowConfirm(false);
      setSelectedUser(null);
      Alert.alert(t('pingSuccessTitle'), t('pingSuccessBody'));
    } catch {
      Alert.alert('오류', '핑 전송에 실패했습니다');
      setShowConfirm(false);
    }
  };

  if (selectedUser) {
    const sharedHobbies = selectedUser.hobbies.filter((h) => myHobbies.includes(h));
    const smokingMatch = mySmoking && selectedUser.smoking === mySmoking;
    const alreadySent = sentIds.includes(selectedUser.id);

    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={() => setSelectedUser(null)}>
            <Text style={styles.backBtn}>{t('verifyBack')}</Text>
          </TouchableOpacity>
          <Text style={styles.detailHeaderTitle}>{t('nearbyProfile')}</Text>
          <View style={styles.pointChip}>
            <Text style={styles.pointChipText}>🤍 {myPoints}</Text>
          </View>
        </View>

        <ScrollView style={styles.container}>
          <View style={styles.detailPhoto}>
            <Text style={styles.detailPhotoEmoji}>👤</Text>
            <Text style={styles.detailPhotoHint}>{t('pingBlurHint')}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.detailName}>{selectedUser.birth_year ? `${new Date().getFullYear() - selectedUser.birth_year}${t('ageSuffix')} · ` : ''}{selectedUser.height}cm</Text>
            <Text style={styles.detailSub}>{translateOption(selectedUser.job, JOB_OPTIONS, t)}</Text>
            {selectedUser.bio ? <Text style={styles.detailBio}>"{selectedUser.bio}"</Text> : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('pingLifestyle')}</Text>
            <View style={styles.lifestyleRow}>
              <LifestyleItem
                icon="🚬" label={t('profileSmoking')}
                value={translateOption(selectedUser.smoking, SMOKING_OPTIONS, t)}
                match={!!smokingMatch} matchLabel={t('pingSmokingMatch')}
              />
              <LifestyleItem
                icon="🍺" label={t('profileDrinking')}
                value={translateOption(selectedUser.drinking, DRINKING_OPTIONS, t)}
                match={false} matchLabel=""
              />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {t('pingHobbies')}
              {sharedHobbies.length > 0 && (
                <Text style={styles.sharedCount}>
                  {' '}· {sharedHobbies.length}{t('pingShared')}
                </Text>
              )}
            </Text>
            <View style={styles.hobbyWrap}>
              {selectedUser.hobbies.map((h) => {
                const isShared = myHobbies.includes(h);
                return (
                  <View key={h} style={[styles.hobbyChip, isShared && styles.hobbyChipShared]}>
                    <Text style={[styles.hobbyChipText, isShared && styles.hobbyChipTextShared]}>
                      {isShared ? '✨ ' : ''}{getLocalizedHobby(h, locale)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {!alreadySent && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('nearbyMessage')}</Text>
              {PING_TEMPLATES.map((tmpl) => (
                <TouchableOpacity
                  key={tmpl}
                  style={[styles.templateItem, selectedTemplate === tmpl && styles.templateItemSelected]}
                  onPress={() => setSelectedTemplate(tmpl)}
                >
                  <Text style={[styles.templateText, selectedTemplate === tmpl && styles.templateTextSelected]}>
                    {tmpl}
                  </Text>
                  {selectedTemplate === tmpl && <Text style={styles.templateCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {alreadySent ? (
            <View style={styles.sentBanner}>
              <Text style={styles.sentBannerText}>{t('nearbySent')}</Text>
              <Text style={styles.sentBannerHint}>{t('nearbySentHint')}</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.sendBtn} onPress={handleSendPress}>
              <Text style={styles.sendBtnText}>{t('nearbySend')}</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        <Modal visible={showConfirm} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalEmoji}>💘</Text>
              <Text style={styles.modalTitle}>{t('nearbyConfirmTitle')}</Text>
              <Text style={styles.modalMessage}>"{selectedTemplate}"</Text>
              <Text style={styles.modalSub}>{t('nearbyConfirmSub')}</Text>
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowConfirm(false)}>
                  <Text style={styles.modalCancelText}>{t('nearbyCancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleConfirm}>
                  <Text style={styles.modalConfirmText}>{t('nearbyConfirmBtn')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('nearbyTitle')}</Text>
        <View style={styles.pointChip}>
          <Text style={styles.pointChipText}>🤍 {myPoints}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchNearby(); }}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.scanBanner}>
          <View style={styles.scanDot} />
          <Text style={styles.scanText}>
            {nearbyUsers.length}{t('nearbyScanCount')}
          </Text>
        </View>

        <Text style={styles.listHint}>{t('nearbyHint')}</Text>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : (
          nearbyUsers.map((user) => {
            const sharedHobbies = user.hobbies.filter((h) => myHobbies.includes(h));
            const smokingMatch = mySmoking && user.smoking === mySmoking;
            const alreadySent = sentIds.includes(user.id);

            return (
              <TouchableOpacity
                key={user.id}
                style={styles.nearbyCard}
                onPress={() => handleUserPress(user)}
              >
                <View style={styles.avatarWrap}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarEmoji}>👤</Text>
                  </View>
                  {alreadySent && (
                    <View style={styles.sentBadge}>
                      <Text style={styles.sentBadgeText}>{t('sentBadge')}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.nearbyInfo}>
                  <View style={styles.nearbyTop}>
                    <Text style={styles.nearbyTitle}>
                      {user.birth_year ? `${new Date().getFullYear() - user.birth_year}${t('ageSuffix')} · ` : ''}{user.height}cm · {translateOption(user.job, JOB_OPTIONS, t)}
                    </Text>
                  </View>

                  <View style={styles.matchTags}>
                    {smokingMatch && (
                      <View style={styles.matchTag}>
                        <Text style={styles.matchTagText}>🚭 {t('pingSmokingMatch')}</Text>
                      </View>
                    )}
                    {sharedHobbies.slice(0, 2).map((h) => (
                      <View key={h} style={styles.matchTag}>
                        <Text style={styles.matchTagText}>✨ {getLocalizedHobby(h, locale)}</Text>
                      </View>
                    ))}
                    {sharedHobbies.length > 2 && (
                      <View style={styles.matchTagMore}>
                        <Text style={styles.matchTagMoreText}>+{sharedHobbies.length - 2}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function LifestyleItem({
  icon, label, value, match, matchLabel,
}: {
  icon: string; label: string; value: string; match: boolean; matchLabel: string;
}) {
  return (
    <View style={[styles.lifestyleItem, match && styles.lifestyleItemMatch]}>
      <Text style={styles.lifestyleIcon}>{icon}</Text>
      <Text style={styles.lifestyleLabel}>{label}</Text>
      <Text style={styles.lifestyleValue}>{value}</Text>
      {match && <Text style={styles.lifestyleMatchBadge}>{matchLabel}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, paddingHorizontal: 16 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.grayLight,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.white },
  pointChip: {
    backgroundColor: Colors.surface, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: Colors.grayLight,
  },
  pointChipText: { color: Colors.white, fontSize: 13, fontWeight: '600' },

  scanBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#0A1520',
    borderRadius: 10, padding: 12, marginTop: 16, marginBottom: 8, gap: 8,
  },
  scanDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4A9EFF' },
  scanText: { color: '#4A9EFF', fontSize: 13 },
  listHint: { color: Colors.textMuted, fontSize: 12, marginBottom: 16, marginTop: 4 },

  nearbyCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 12,
    flexDirection: 'row', gap: 14, borderWidth: 1, borderColor: Colors.grayLight,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.grayLight,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 28 },
  sentBadge: {
    position: 'absolute', bottom: -4, right: -4,
    backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 4, paddingVertical: 2,
  },
  sentBadgeText: { color: Colors.white, fontSize: 9, fontWeight: 'bold' },
  nearbyInfo: { flex: 1 },
  nearbyTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  nearbyTitle: { color: Colors.white, fontSize: 15, fontWeight: '600' },
  matchTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  matchTag: {
    backgroundColor: '#2D1F3D', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.primaryLight,
  },
  matchTagText: { color: Colors.primaryLight, fontSize: 11 },
  matchTagMore: { backgroundColor: Colors.grayLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  matchTagMoreText: { color: Colors.textMuted, fontSize: 11 },

  detailHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.grayLight,
  },
  backBtn: { color: Colors.primaryLight, fontSize: 16 },
  detailHeaderTitle: { color: Colors.white, fontSize: 17, fontWeight: '700' },

  detailPhoto: {
    backgroundColor: Colors.surface, borderRadius: 20, height: 220, marginTop: 16,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.grayLight,
  },
  detailPhotoEmoji: { fontSize: 72 },
  detailPhotoHint: { color: Colors.textMuted, fontSize: 12, marginTop: 8 },

  card: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginTop: 12,
    borderWidth: 1, borderColor: Colors.grayLight,
  },
  cardTitle: { color: Colors.white, fontSize: 15, fontWeight: '700', marginBottom: 12 },
  detailName: { color: Colors.white, fontSize: 22, fontWeight: 'bold' },
  detailSub: { color: Colors.textMuted, fontSize: 14, marginTop: 4 },
  detailBio: { color: Colors.primaryLight, fontSize: 14, marginTop: 10, fontStyle: 'italic' },
  sharedCount: { color: Colors.primaryLight, fontWeight: '400' },

  lifestyleRow: { flexDirection: 'row', gap: 10 },
  lifestyleItem: {
    flex: 1, backgroundColor: Colors.grayLight, borderRadius: 12, padding: 12, alignItems: 'center', gap: 4,
  },
  lifestyleItemMatch: { backgroundColor: '#2D1F3D', borderWidth: 1, borderColor: Colors.primaryLight },
  lifestyleIcon: { fontSize: 22 },
  lifestyleLabel: { color: Colors.textMuted, fontSize: 11 },
  lifestyleValue: { color: Colors.white, fontSize: 14, fontWeight: '600' },
  lifestyleMatchBadge: {
    color: Colors.primaryLight, fontSize: 10, fontWeight: '700',
    backgroundColor: '#3D1F4D', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },

  hobbyWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hobbyChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: Colors.grayLight },
  hobbyChipShared: { backgroundColor: '#2D1F3D', borderWidth: 1, borderColor: Colors.primaryLight },
  hobbyChipText: { color: Colors.textMuted, fontSize: 13 },
  hobbyChipTextShared: { color: Colors.primaryLight, fontWeight: '600' },

  templateItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: Colors.grayLight,
  },
  templateItemSelected: { borderBottomColor: Colors.primary },
  templateText: { color: Colors.textMuted, fontSize: 14, flex: 1 },
  templateTextSelected: { color: Colors.white, fontWeight: '600' },
  templateCheck: { color: Colors.primary, fontSize: 16, fontWeight: 'bold' },

  sendBtn: {
    backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 18, alignItems: 'center', marginTop: 20,
  },
  sendBtnText: { color: Colors.white, fontSize: 17, fontWeight: '700' },

  sentBanner: {
    backgroundColor: '#0A2A0A', borderRadius: 14, paddingVertical: 18,
    alignItems: 'center', marginTop: 20, gap: 4,
  },
  sentBannerText: { color: '#4CAF50', fontSize: 16, fontWeight: '700' },
  sentBannerHint: { color: '#4CAF50', fontSize: 12, opacity: 0.7 },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center',
  },
  modalBox: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: 28, width: '80%',
    alignItems: 'center', borderWidth: 1, borderColor: Colors.grayLight,
  },
  modalEmoji: { fontSize: 48, marginBottom: 12 },
  modalTitle: { color: Colors.white, fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  modalMessage: {
    color: Colors.primaryLight, fontSize: 14, fontStyle: 'italic', textAlign: 'center', marginBottom: 8,
  },
  modalSub: { color: Colors.textMuted, fontSize: 12, marginBottom: 24 },
  modalBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancelBtn: {
    flex: 1, backgroundColor: Colors.grayLight, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  modalCancelText: { color: Colors.white, fontWeight: '600' },
  modalConfirmBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  modalConfirmText: { color: Colors.white, fontWeight: '700' },
});
