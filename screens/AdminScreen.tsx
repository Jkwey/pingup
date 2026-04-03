import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity,
  Alert, TextInput, Modal, ActivityIndicator, Image, RefreshControl,
} from 'react-native';
import { Colors } from '../constants/colors';
import { adminAPI } from '../services/api';

type AdminUser = {
  id: string;
  nickname?: string;
  height?: number;
  job?: string;
  photo_url?: string;
  banned: boolean;
  ban_reason?: string;
  is_admin: boolean;
  created_at: string;
};

type Props = { onClose: () => void };

export default function AdminScreen({ onClose }: Props) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState('');
  const [showBanModal, setShowBanModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'banned'>('all');

  const fetchUsers = useCallback(async () => {
    try {
      const res = await adminAPI.getUsers();
      if (res.ok) setUsers(res.users || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleBan = async () => {
    if (!selected) return;
    const res = await adminAPI.banUser(selected.id, banReason || undefined);
    if (res.ok) {
      setUsers((prev) => prev.map((u) => u.id === selected.id ? { ...u, banned: true, ban_reason: banReason } : u));
      setShowBanModal(false);
      setBanReason('');
      setSelected(null);
      Alert.alert('완료', '해당 유저가 정지됐습니다');
    } else {
      Alert.alert('오류', res.message);
    }
  };

  const handleUnban = async (user: AdminUser) => {
    Alert.alert('정지 해제', `${user.nickname || '유저'}의 정지를 해제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '해제',
        onPress: async () => {
          const res = await adminAPI.unbanUser(user.id);
          if (res.ok) {
            setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, banned: false, ban_reason: undefined } : u));
          }
        },
      },
    ]);
  };

  const handleDeletePhoto = async (user: AdminUser) => {
    Alert.alert('사진 삭제', '이 사진을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          const res = await adminAPI.deletePhoto(user.id);
          if (res.ok) {
            setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, photo_url: undefined } : u));
            setSelected(null);
          }
        },
      },
    ]);
  };

  const displayed = filter === 'banned' ? users.filter((u) => u.banned) : users;
  const bannedCount = users.filter((u) => u.banned).length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeBtn}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>관리자 패널</Text>
        <Text style={styles.count}>{users.length}명</Text>
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'all' && styles.filterBtnActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>전체 {users.length}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'banned' && styles.filterBtnActive]}
          onPress={() => setFilter('banned')}
        >
          <Text style={[styles.filterText, filter === 'banned' && styles.filterTextActive]}>정지됨 {bannedCount}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchUsers(); }} tintColor={Colors.primary} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.userCard, item.banned && styles.userCardBanned]}
              onPress={() => setSelected(item)}
            >
              <View style={styles.photoWrap}>
                {item.photo_url ? (
                  <Image source={{ uri: item.photo_url }} style={styles.photo} />
                ) : (
                  <View style={[styles.photo, styles.photoPlaceholder]}>
                    <Text style={{ fontSize: 20 }}>👤</Text>
                  </View>
                )}
                {item.is_admin && (
                  <View style={styles.adminBadge}>
                    <Text style={styles.adminBadgeText}>관리자</Text>
                  </View>
                )}
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.nickname || '미설정'}</Text>
                <Text style={styles.userSub}>
                  {item.height ? `${item.height}cm · ` : ''}{item.job || ''}
                </Text>
                <Text style={styles.userId} numberOfLines={1}>{item.id}</Text>
                {item.banned && (
                  <View style={styles.bannedBadge}>
                    <Text style={styles.bannedText}>🚫 {item.ban_reason || '정지됨'}</Text>
                  </View>
                )}
              </View>
              {!item.is_admin && (
                <View style={styles.actions}>
                  {item.banned ? (
                    <TouchableOpacity style={styles.unbanBtn} onPress={() => handleUnban(item)}>
                      <Text style={styles.unbanText}>해제</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.banBtn} onPress={() => { setSelected(item); setShowBanModal(true); }}>
                      <Text style={styles.banText}>정지</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}

      {/* 유저 상세 / 사진 확인 모달 */}
      <Modal visible={!!selected && !showBanModal} transparent animationType="slide">
        {selected && (
          <View style={styles.modalOverlay}>
            <View style={styles.detailBox}>
              <TouchableOpacity style={styles.detailClose} onPress={() => setSelected(null)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>

              {selected.photo_url ? (
                <Image source={{ uri: selected.photo_url }} style={styles.detailPhoto} />
              ) : (
                <View style={[styles.detailPhoto, styles.photoPlaceholder]}>
                  <Text style={{ fontSize: 48 }}>👤</Text>
                </View>
              )}

              <Text style={styles.detailName}>{selected.nickname || '미설정'}</Text>
              <Text style={styles.detailSub}>
                {selected.height ? `${selected.height}cm` : ''}{selected.job ? ` · ${selected.job}` : ''}
              </Text>
              <Text style={styles.detailId}>{selected.id}</Text>

              {selected.banned && (
                <Text style={styles.detailBanned}>🚫 {selected.ban_reason}</Text>
              )}

              {!selected.is_admin && (
                <View style={styles.detailActions}>
                  {selected.photo_url && (
                    <TouchableOpacity style={styles.deletePhotoBtn} onPress={() => handleDeletePhoto(selected)}>
                      <Text style={styles.deletePhotoBtnText}>사진 삭제</Text>
                    </TouchableOpacity>
                  )}
                  {selected.banned ? (
                    <TouchableOpacity style={styles.unbanBtnLg} onPress={() => { handleUnban(selected); setSelected(null); }}>
                      <Text style={styles.unbanBtnLgText}>정지 해제</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.banBtnLg} onPress={() => setShowBanModal(true)}>
                      <Text style={styles.banBtnLgText}>계정 정지</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>
        )}
      </Modal>

      {/* 정지 사유 입력 모달 */}
      <Modal visible={showBanModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.banBox}>
            <Text style={styles.banBoxTitle}>계정 정지</Text>
            <Text style={styles.banBoxSub}>{selected?.nickname || '유저'}를 정지합니다</Text>
            <TextInput
              style={styles.banInput}
              placeholder="정지 사유 (예: 부적절한 사진)"
              placeholderTextColor={Colors.gray}
              value={banReason}
              onChangeText={setBanReason}
            />
            <View style={styles.banBtns}>
              <TouchableOpacity style={styles.banCancelBtn} onPress={() => { setShowBanModal(false); setBanReason(''); }}>
                <Text style={styles.banCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.banConfirmBtn} onPress={handleBan}>
                <Text style={styles.banConfirmText}>정지</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.grayLight,
  },
  closeBtn: { color: Colors.textMuted, fontSize: 18 },
  title: { color: Colors.white, fontSize: 18, fontWeight: 'bold' },
  count: { color: Colors.textMuted, fontSize: 14 },

  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.grayLight,
  },
  filterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: Colors.white },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 10 },

  userCard: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 12,
    flexDirection: 'row', gap: 12, borderWidth: 1, borderColor: Colors.grayLight,
  },
  userCardBanned: { borderColor: '#FF3B30', opacity: 0.7 },
  photoWrap: { position: 'relative' },
  photo: { width: 60, height: 60, borderRadius: 10 },
  photoPlaceholder: { backgroundColor: Colors.grayLight, alignItems: 'center', justifyContent: 'center' },
  adminBadge: {
    position: 'absolute', bottom: -4, right: -4,
    backgroundColor: Colors.secondary, borderRadius: 6, paddingHorizontal: 4, paddingVertical: 2,
  },
  adminBadgeText: { color: Colors.white, fontSize: 9, fontWeight: 'bold' },
  userInfo: { flex: 1 },
  userName: { color: Colors.white, fontSize: 15, fontWeight: '600' },
  userSub: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  userId: { color: Colors.grayLight, fontSize: 9, marginTop: 4 },
  bannedBadge: { marginTop: 4 },
  bannedText: { color: '#FF3B30', fontSize: 11 },

  actions: { justifyContent: 'center' },
  banBtn: {
    backgroundColor: '#3A1010', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: '#FF3B30',
  },
  banText: { color: '#FF3B30', fontSize: 12, fontWeight: '700' },
  unbanBtn: {
    backgroundColor: '#0A2A0A', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: '#4CAF50',
  },
  unbanText: { color: '#4CAF50', fontSize: 12, fontWeight: '700' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center',
  },
  detailBox: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: 24, width: '90%',
    alignItems: 'center', borderWidth: 1, borderColor: Colors.grayLight,
  },
  detailClose: { alignSelf: 'flex-end', marginBottom: 12 },
  detailPhoto: { width: '100%', height: 240, borderRadius: 14, marginBottom: 16 },
  detailName: { color: Colors.white, fontSize: 20, fontWeight: 'bold' },
  detailSub: { color: Colors.textMuted, fontSize: 14, marginTop: 4 },
  detailId: { color: Colors.grayLight, fontSize: 10, marginTop: 6 },
  detailBanned: { color: '#FF3B30', fontSize: 13, marginTop: 8 },
  detailActions: { flexDirection: 'row', gap: 10, marginTop: 20, width: '100%' },
  deletePhotoBtn: {
    flex: 1, backgroundColor: Colors.grayLight, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  deletePhotoBtnText: { color: Colors.white, fontWeight: '600' },
  banBtnLg: {
    flex: 1, backgroundColor: '#3A1010', borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#FF3B30',
  },
  banBtnLgText: { color: '#FF3B30', fontWeight: '700' },
  unbanBtnLg: {
    flex: 1, backgroundColor: '#0A2A0A', borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#4CAF50',
  },
  unbanBtnLgText: { color: '#4CAF50', fontWeight: '700' },

  banBox: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: 24, width: '85%',
    borderWidth: 1, borderColor: Colors.grayLight,
  },
  banBoxTitle: { color: Colors.white, fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  banBoxSub: { color: Colors.textMuted, fontSize: 13, marginBottom: 16 },
  banInput: {
    backgroundColor: Colors.grayLight, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, color: Colors.white, fontSize: 14,
    marginBottom: 16,
  },
  banBtns: { flexDirection: 'row', gap: 10 },
  banCancelBtn: {
    flex: 1, backgroundColor: Colors.grayLight, borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  banCancelText: { color: Colors.white, fontWeight: '600' },
  banConfirmBtn: {
    flex: 1, backgroundColor: '#FF3B30', borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  banConfirmText: { color: Colors.white, fontWeight: '700' },
});
