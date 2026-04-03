import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Switch, Modal,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Colors } from '../constants/colors';
import { useLocale } from '../hooks/useLocale';
import { TranslationKey } from '../constants/i18n';
import {
  JOB_OPTIONS, SMOKING_OPTIONS, DRINKING_OPTIONS,
  getLocalizedHobby, translateOption,
} from '../constants/options';
import * as Location from 'expo-location';
import { pingAPI, userAPI } from '../services/api';

const DISTANCE_OPTIONS: { label: string; value: number; descKey: TranslationKey }[] = [
  { label: '50m',  value: 50,  descKey: 'distanceDesc50' },
  { label: '100m', value: 100, descKey: 'distanceDesc100' },
  { label: '200m', value: 200, descKey: 'distanceDesc200' },
  { label: '500m', value: 500, descKey: 'distanceDesc500' },
];

type Ping = {
  id: string;
  message: string;
  status: string;
  created_at: string;
  sender: {
    id: string;
    height: number;
    job: string;
    smoking: string;
    drinking: string;
    hobbies: string[];
    bio?: string;
    birth_year?: number;
  };
};

type Props = {
  hearts: number;
  currentUser: any | null;
  onPingRead?: () => void;
};

function getMinutesAgo(isoString: string): number {
  return Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
}

function calcAge(birthYear?: number): string {
  if (!birthYear) return '';
  return String(new Date().getFullYear() - birthYear);
}

export default function HomeScreen({ hearts, currentUser, onPingRead }: Props) {
  const { t, locale } = useLocale();
  const [pings, setPings] = useState<Ping[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Ping | null>(null);
  const [delayedPing, setDelayedPing] = useState(true);
  const [distance, setDistance] = useState(100);
  const [showDistancePicker, setShowDistancePicker] = useState(false);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.delayed_ping !== undefined) setDelayedPing(currentUser.delayed_ping);
      if (currentUser.distance) setDistance(currentUser.distance);
    }
  }, [currentUser]);

  const fetchPings = useCallback(async () => {
    try {
      const res = await pingAPI.getReceived();
      if (res.ok) setPings(res.pings || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchPings(); }, [fetchPings]);

  // 백그라운드 위치 주기적 업데이트 (3분마다)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const startLocationUpdates = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const updateLocation = async () => {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          userAPI.updateLocation(loc.coords.latitude, loc.coords.longitude);
        } catch {}
      };

      updateLocation();
      interval = setInterval(updateLocation, 10 * 60 * 1000);
    };

    startLocationUpdates();
    return () => { if (interval) clearInterval(interval); };
  }, []);

  const handleDelayedPingChange = (value: boolean) => {
    setDelayedPing(value);
    userAPI.updateSettings({ delayedPing: value });
  };

  const handleDistanceChange = (value: number) => {
    setDistance(value);
    setShowDistancePicker(false);
    userAPI.updateSettings({ distance: value });
  };

  const handleAccept = async (id: string) => {
    const res = await pingAPI.accept(id);
    if (res.ok) {
      setPings((prev) => prev.filter((p) => p.id !== id));
      setSelected(null);
    }
  };

  const handleReject = async (id: string) => {
    await pingAPI.reject(id);
    setPings((prev) => prev.filter((p) => p.id !== id));
    setSelected(null);
  };

  const myHobbies: string[] = currentUser?.hobbies || [];
  const mySmoking: string = currentUser?.smoking || '';

  if (selected) {
    onPingRead?.();
    return (
      <PingDetailCard
        ping={selected}
        onAccept={() => handleAccept(selected.id)}
        onReject={() => handleReject(selected.id)}
        onClose={() => setSelected(null)}
        t={t}
        locale={locale}
        myHobbies={myHobbies}
        mySmoking={mySmoking}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('appName')}</Text>
        <View style={styles.pointBadge}>
          <Text style={styles.pointText}>🤍 {hearts}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchPings(); }}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.statusBanner}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>{t('homeDetecting')}</Text>
        </View>

        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingTitle}>{t('homeDelayedPing')}</Text>
              <Text style={styles.settingDesc}>
                {delayedPing ? t('homeDelayedOn') : t('homeDelayedOff')}
              </Text>
            </View>
            <Switch
              value={delayedPing}
              onValueChange={handleDelayedPingChange}
              trackColor={{ false: Colors.grayLight, true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.settingRow} onPress={() => setShowDistancePicker(true)}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingTitle}>{t('homeDistance')}</Text>
              <Text style={styles.settingDesc}>
                {t(DISTANCE_OPTIONS.find((d) => d.value === distance)?.descKey ?? 'distanceDesc100')}
              </Text>
            </View>
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceBadgeText}>{distance}m  ›</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Modal visible={showDistancePicker} transparent animationType="fade">
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowDistancePicker(false)}
          >
            <View style={styles.pickerBox}>
              <Text style={styles.pickerTitle}>{t('distancePickerTitle')}</Text>
              <Text style={styles.pickerHint}>{t('distancePickerHint')}</Text>
              {DISTANCE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.pickerItem, distance === opt.value && styles.pickerItemSelected]}
                  onPress={() => handleDistanceChange(opt.value)}
                >
                  <Text style={[styles.pickerItemLabel, distance === opt.value && styles.pickerItemLabelSelected]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.pickerItemDesc}>{t(opt.descKey)}</Text>
                  {distance === opt.value && <Text style={styles.pickerCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('homeReceived')}</Text>
          {pings.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pings.length}</Text>
            </View>
          )}
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : pings.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>💤</Text>
            <Text style={styles.emptyText}>{t('homeEmpty')}</Text>
            <Text style={styles.emptyHint}>{t('homeEmptyHint')}</Text>
          </View>
        ) : (
          pings.map((ping) => (
            <PingListItem
              key={ping.id}
              ping={ping}
              onPress={() => setSelected(ping)}
              t={t}
              locale={locale}
              myHobbies={myHobbies}
              mySmoking={mySmoking}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PingListItem({
  ping, onPress, t, locale, myHobbies, mySmoking,
}: {
  ping: Ping;
  onPress: () => void;
  t: (k: TranslationKey) => string;
  locale: string;
  myHobbies: string[];
  mySmoking: string;
}) {
  const sharedHobbies = ping.sender.hobbies.filter((h) => myHobbies.includes(h));
  const smokingMatch = mySmoking && ping.sender.smoking === mySmoking;
  const mins = getMinutesAgo(ping.created_at);

  return (
    <TouchableOpacity style={styles.pingCard} onPress={onPress}>
      <View style={styles.avatarBlur}>
        <Text style={styles.avatarEmoji}>👤</Text>
      </View>
      <View style={styles.pingInfo}>
        <View style={styles.pingTop}>
          <Text style={styles.pingTitle}>
            {calcAge(ping.sender.birth_year) ? `${calcAge(ping.sender.birth_year)}${t('ageSuffix')} · ` : ''}{ping.sender.height}cm · {translateOption(ping.sender.job, JOB_OPTIONS, t)}
          </Text>
          <Text style={styles.pingTime}>{mins} {t('minutesAgo')}</Text>
        </View>
        <Text style={styles.pingMessage} numberOfLines={1}>💌 "{ping.message}"</Text>
        <View style={styles.matchTags}>
          {smokingMatch && (
            <View style={styles.matchTag}>
              <Text style={styles.matchTagText}>🚭 {t('profileSmoking')} {t('pingSmokingMatch')}</Text>
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
}

function PingDetailCard({
  ping, onAccept, onReject, onClose, t, locale, myHobbies, mySmoking,
}: {
  ping: Ping;
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
  t: (k: TranslationKey) => string;
  locale: string;
  myHobbies: string[];
  mySmoking: string;
}) {
  const handleReport = () => {
    Alert.alert('신고', '신고 사유를 선택해주세요', [
      { text: '불쾌한 메시지', onPress: () => doReport('불쾌한 메시지') },
      { text: '스팸/광고', onPress: () => doReport('스팸/광고') },
      { text: '사칭', onPress: () => doReport('사칭') },
      { text: '취소', style: 'cancel' },
    ]);
  };

  const doReport = async (reason: string) => {
    await userAPI.report(ping.sender.id, reason);
    Alert.alert('신고 완료', '신고가 접수됐습니다');
    onReject();
  };

  const handleBlock = () => {
    Alert.alert('차단', '이 사용자를 차단하면 서로 보이지 않습니다', [
      { text: '취소', style: 'cancel' },
      {
        text: '차단',
        style: 'destructive',
        onPress: async () => {
          await userAPI.block(ping.sender.id);
          Alert.alert('차단 완료');
          onReject();
        },
      },
    ]);
  };
  const sharedHobbies = ping.sender.hobbies.filter((h) => myHobbies.includes(h));
  const smokingMatch = mySmoking && ping.sender.smoking === mySmoking;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.backBtn}>{t('verifyBack')}</Text>
        </TouchableOpacity>
        <Text style={styles.detailHeaderTitle}>{t('homePingDetail')}</Text>
        <TouchableOpacity onPress={() => Alert.alert('', '', [
          { text: '신고', onPress: handleReport },
          { text: '차단', style: 'destructive', onPress: handleBlock },
          { text: '취소', style: 'cancel' },
        ])}>
          <Text style={{ color: Colors.textMuted, fontSize: 22 }}>⋯</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container}>
        <View style={styles.detailPhoto}>
          <Text style={styles.detailPhotoEmoji}>👤</Text>
          <Text style={styles.detailPhotoHint}>{t('pingBlurHint')}</Text>
        </View>

        <View style={styles.detailCard}>
          <Text style={styles.detailName}>{calcAge(ping.sender.birth_year) ? `${calcAge(ping.sender.birth_year)}${t('ageSuffix')} · ` : ''}{ping.sender.height}cm</Text>
          <Text style={styles.detailSub}>{translateOption(ping.sender.job, JOB_OPTIONS, t)}</Text>
          {ping.sender.bio ? <Text style={styles.detailBio}>"{ping.sender.bio}"</Text> : null}
          <Text style={styles.detailMessage}>💌 "{ping.message}"</Text>
        </View>

        <View style={styles.detailCard}>
          <Text style={styles.detailSectionTitle}>{t('pingLifestyle')}</Text>
          <View style={styles.lifestyleRow}>
            <LifestyleItem
              icon="🚬" label={t('profileSmoking')}
              value={translateOption(ping.sender.smoking, SMOKING_OPTIONS, t)}
              match={!!smokingMatch} matchLabel={t('pingSmokingMatch')}
            />
            <LifestyleItem
              icon="🍺" label={t('profileDrinking')}
              value={translateOption(ping.sender.drinking, DRINKING_OPTIONS, t)}
              match={false} matchLabel=""
            />
          </View>
        </View>

        <View style={styles.detailCard}>
          <Text style={styles.detailSectionTitle}>
            {t('pingHobbies')}
            {sharedHobbies.length > 0 && (
              <Text style={styles.sharedCount}> · {sharedHobbies.length}{t('pingShared')}</Text>
            )}
          </Text>
          <View style={styles.hobbyWrap}>
            {ping.sender.hobbies.map((h) => {
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

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.rejectBtn} onPress={onReject}>
            <Text style={styles.rejectBtnText}>{t('pingReject')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptBtn} onPress={onAccept}>
            <Text style={styles.acceptBtnText}>{t('pingAccept')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
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
  pointBadge: {
    backgroundColor: Colors.surface, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: Colors.grayLight,
  },
  pointText: { color: Colors.white, fontSize: 13, fontWeight: '600' },

  settingCard: {
    backgroundColor: Colors.surface, borderRadius: 14, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.grayLight, overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14,
  },
  settingLeft: { flex: 1, marginRight: 12 },
  settingTitle: { color: Colors.white, fontSize: 14, fontWeight: '600' },
  settingDesc: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.grayLight, marginHorizontal: 14 },
  distanceBadge: {
    backgroundColor: Colors.grayLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
  },
  distanceBadgeText: { color: Colors.white, fontSize: 14, fontWeight: '600' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center',
  },
  pickerBox: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: 24, width: '85%',
    borderWidth: 1, borderColor: Colors.grayLight, gap: 8,
  },
  pickerTitle: { color: Colors.white, fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  pickerHint: { color: Colors.textMuted, fontSize: 12, marginBottom: 8, lineHeight: 18 },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12,
    borderRadius: 12, gap: 10,
  },
  pickerItemSelected: { backgroundColor: Colors.surfaceHigh },
  pickerItemLabel: { color: Colors.white, fontSize: 16, fontWeight: '600', width: 50 },
  pickerItemLabelSelected: { color: Colors.primaryLight },
  pickerItemDesc: { color: Colors.textMuted, fontSize: 13, flex: 1 },
  pickerCheck: { color: Colors.primary, fontSize: 16, fontWeight: 'bold' },

  statusBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#0A1A0F',
    borderRadius: 10, padding: 12, marginTop: 16, marginBottom: 8, gap: 8,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50' },
  statusText: { color: '#4CAF50', fontSize: 13 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.white },
  badge: {
    backgroundColor: Colors.primary, width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: Colors.white, fontSize: 12, fontWeight: 'bold' },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: Colors.white, fontSize: 17, fontWeight: '600' },
  emptyHint: { color: Colors.textMuted, fontSize: 13, marginTop: 6 },

  pingCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 12,
    flexDirection: 'row', gap: 14, borderWidth: 1, borderColor: Colors.grayLight,
  },
  avatarBlur: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.grayLight,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 28 },
  pingInfo: { flex: 1 },
  pingTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  pingTitle: { color: Colors.white, fontSize: 15, fontWeight: '600' },
  pingTime: { color: Colors.textMuted, fontSize: 12 },
  pingMessage: { color: Colors.primaryLight, fontSize: 12, marginBottom: 6, fontStyle: 'italic' },
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
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.grayLight,
  },
  backBtn: { color: Colors.primaryLight, fontSize: 16 },
  detailHeaderTitle: { color: Colors.white, fontSize: 17, fontWeight: '700' },

  detailPhoto: {
    backgroundColor: Colors.surface, borderRadius: 20, height: 220, marginTop: 16,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.grayLight,
  },
  detailPhotoEmoji: { fontSize: 72 },
  detailPhotoHint: { color: Colors.textMuted, fontSize: 12, marginTop: 8 },

  detailCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginTop: 12,
    borderWidth: 1, borderColor: Colors.grayLight,
  },
  detailName: { color: Colors.white, fontSize: 22, fontWeight: 'bold' },
  detailSub: { color: Colors.textMuted, fontSize: 14, marginTop: 4 },
  detailBio: { color: Colors.primaryLight, fontSize: 14, marginTop: 10, fontStyle: 'italic' },
  detailMessage: { color: Colors.white, fontSize: 15, marginTop: 12, lineHeight: 22 },
  detailSectionTitle: { color: Colors.white, fontSize: 15, fontWeight: '700', marginBottom: 12 },
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

  actionRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  rejectBtn: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 14, paddingVertical: 18,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.grayLight,
  },
  rejectBtnText: { color: Colors.textMuted, fontSize: 16, fontWeight: '700' },
  acceptBtn: { flex: 2, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  acceptBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
