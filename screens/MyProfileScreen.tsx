import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Modal, Image,
} from 'react-native';
import { Colors } from '../constants/colors';
import { useLocale } from '../hooks/useLocale';
import ShopScreen from './ShopScreen';
import SettingsScreen from './SettingsScreen';
import AdminScreen from './AdminScreen';
import ProfileSetupScreen from './ProfileSetupScreen';
import { JOB_OPTIONS, translateOption } from '../constants/options';
import { userAPI } from '../services/api';

type Props = {
  hearts: number;
  onHeartsAdded: (amount: number) => void;
  onLogout: () => void;
  currentUser: any | null;
};

export default function MyProfileScreen({ hearts, onHeartsAdded, onLogout, currentUser }: Props) {
  const { t } = useLocale();
  const [showShop, setShowShop] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [stats, setStats] = useState({ sentPings: 0, receivedPings: 0, matched: 0 });
  const isAdmin = currentUser?.is_admin === true;

  useEffect(() => {
    userAPI.getStats().then((res) => {
      if (res.ok) setStats(res.stats);
    });
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('homeProfile')}</Text>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <TouchableOpacity onPress={() => setShowEdit(true)}>
            <Text style={styles.settingsBtn}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowSettings(true)}>
            <Text style={styles.settingsBtn}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.container}>
        <View style={styles.avatar}>
          {currentUser?.photo_url ? (
            <Image source={{ uri: currentUser.photo_url }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarEmoji}>👤</Text>
          )}
        </View>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{currentUser?.nickname || t('profileNickname')}</Text>
          {isAdmin && <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>관리자</Text></View>}
        </View>
        <Text style={styles.sub}>
          {currentUser?.height ? `${currentUser.height}cm · ` : ''}
          {currentUser?.job ? translateOption(currentUser.job, JOB_OPTIONS, t) : ''}
        </Text>

        <View style={styles.heartCard}>
          <Text style={styles.heartLabel}>{t('shopBalance')}</Text>
          <Text style={styles.heartValue}>🤍 {isAdmin ? '∞' : hearts}</Text>
          <Text style={styles.heartHint}>{isAdmin ? '무제한' : t('shopBalanceHint')}</Text>
          {!isAdmin && (
            <TouchableOpacity style={styles.chargeBtn} onPress={() => setShowShop(true)}>
              <Text style={styles.chargeBtnText}>{t('shopTitle')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {isAdmin && (
          <TouchableOpacity style={styles.adminBtn} onPress={() => setShowAdmin(true)}>
            <Text style={styles.adminBtnText}>🛡️ 관리자 패널</Text>
          </TouchableOpacity>
        )}

        <View style={styles.statsRow}>
          <StatBox label={t('statSentPing')} value={String(stats.sentPings)} />
          <StatBox label={t('statReceivedPing')} value={String(stats.receivedPings)} />
          <StatBox label={t('statMatched')} value={String(stats.matched)} />
        </View>
      </View>

      <Modal visible={showShop} animationType="slide">
        <ShopScreen hearts={hearts} onHeartsAdded={onHeartsAdded} onClose={() => setShowShop(false)} />
      </Modal>

      <Modal visible={showSettings} animationType="slide">
        <SettingsScreen onLogout={onLogout} onClose={() => setShowSettings(false)} />
      </Modal>

      <Modal visible={showAdmin} animationType="slide">
        <AdminScreen onClose={() => setShowAdmin(false)} />
      </Modal>

      <Modal visible={showEdit} animationType="slide">
        <ProfileSetupScreen
          initialData={{
            nickname: currentUser?.nickname,
            height: currentUser?.height,
            birthYear: currentUser?.birth_year,
            gender: currentUser?.gender,
            interestGender: currentUser?.interest_gender,
            job: currentUser?.job,
            smoking: currentUser?.smoking,
            drinking: currentUser?.drinking,
            hobbies: currentUser?.hobbies,
            bio: currentUser?.bio,
            photoUrl: currentUser?.photo_url,
          }}
          onComplete={() => setShowEdit(false)}
          onBack={() => setShowEdit(false)}
        />
      </Modal>
    </SafeAreaView>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grayLight,
  },
  title: { fontSize: 20, fontWeight: 'bold', color: Colors.white },
  settingsBtn: { fontSize: 24, paddingLeft: 8 },
  container: { flex: 1, alignItems: 'center', paddingTop: 40 },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarEmoji: { fontSize: 48 },
  avatarImg: { width: 100, height: 100, borderRadius: 50 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 22, fontWeight: 'bold', color: Colors.white },
  adminBadge: {
    backgroundColor: Colors.secondary, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  adminBadgeText: { color: Colors.white, fontSize: 11, fontWeight: '700' },
  sub: { color: Colors.textMuted, fontSize: 14, marginTop: 4 },
  adminBtn: {
    backgroundColor: Colors.surfaceHigh, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24,
    marginTop: 12, borderWidth: 1, borderColor: Colors.secondary, width: '85%', alignItems: 'center',
  },
  adminBtnText: { color: Colors.secondary, fontSize: 15, fontWeight: '700' },
  heartCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginTop: 28,
    width: '85%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.grayLight,
    gap: 6,
  },
  heartLabel: { color: Colors.textMuted, fontSize: 13 },
  heartValue: { color: Colors.white, fontSize: 36, fontWeight: 'bold' },
  heartHint: { color: Colors.textMuted, fontSize: 11 },
  chargeBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 10,
  },
  chargeBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    width: '85%',
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.grayLight,
    gap: 4,
  },
  statValue: { color: Colors.white, fontSize: 22, fontWeight: 'bold' },
  statLabel: { color: Colors.textMuted, fontSize: 12 },
});
