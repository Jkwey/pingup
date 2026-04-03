import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { Colors } from '../constants/colors';
import { useLocale } from '../hooks/useLocale';
import ChatDetailScreen from './ChatDetailScreen';
import { JOB_OPTIONS, getLocalizedHobby, translateOption } from '../constants/options';
import { chatAPI } from '../services/api';
import { getSocket } from '../services/socket';

type Room = {
  id: string;
  partner: {
    id: string;
    height: number;
    job: string;
    hobbies: string[];
    photo_url?: string;
    birth_year?: number;
  };
  lastMessage: {
    text: string;
    created_at: string;
    sender_id: string;
  } | null;
  unread: number;
};

type Props = {
  myUserId?: string;
  myHobbies: string[];
};

export default function ChatScreen({ myUserId, myHobbies }: Props) {
  const { t, locale } = useLocale();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Room | null>(null);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await chatAPI.getRooms();
      if (res.ok) {
        setRooms((res.rooms || []).map((r: any) => ({ ...r, unread: 0 })));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handler = (msg: { room_id: string; text: string; created_at: string; sender_id: string }) => {
      setRooms((prev) => prev.map((r) => {
        if (r.id !== msg.room_id) return r;
        const isOpen = selected?.id === msg.room_id;
        return {
          ...r,
          lastMessage: { text: msg.text, created_at: msg.created_at, sender_id: msg.sender_id },
          unread: isOpen ? 0 : r.unread + 1,
        };
      }));
    };

    socket.on('new_message', handler);
    return () => { socket.off('new_message', handler); };
  }, [selected]);

  const handleSelect = (item: Room) => {
    setRooms((prev) => prev.map((r) => r.id === item.id ? { ...r, unread: 0 } : r));
    setSelected(item);
  };

  if (selected) {
    const sharedHobbies = selected.partner.hobbies.filter((h) => myHobbies.includes(h));
    return (
      <ChatDetailScreen
        roomId={selected.id}
        myUserId={myUserId || ''}
        partner={{
          id: selected.partner.id,
          height: selected.partner.height,
          job: selected.partner.job,
          photoUrl: selected.partner.photo_url,
          sharedHobbies,
          birthYear: selected.partner.birth_year,
        }}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('chatTitle')}</Text>
        <Text style={styles.sub}>{rooms.length}</Text>
      </View>

      {loading ? (
        <View style={styles.empty}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : rooms.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyText}>{t('chatEmpty')}</Text>
          <Text style={styles.emptyHint}>{t('chatEmptyHint')}</Text>
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const sharedHobbies = item.partner.hobbies.filter((h) => myHobbies.includes(h));
            return (
              <TouchableOpacity style={styles.matchCard} onPress={() => handleSelect(item)}>
                <View style={styles.avatar}>
                  {item.partner.photo_url ? (
                    <Image source={{ uri: item.partner.photo_url }} style={styles.avatarImg} />
                  ) : (
                    <Text style={styles.avatarEmoji}>👤</Text>
                  )}
                </View>
                <View style={styles.matchInfo}>
                  <View style={styles.matchTop}>
                    <Text style={styles.matchName}>
                      {item.partner.birth_year ? `${new Date().getFullYear() - item.partner.birth_year}${t('ageSuffix')} · ` : ''}{item.partner.height}cm · {translateOption(item.partner.job, JOB_OPTIONS, t)}
                    </Text>
                    {item.lastMessage && (
                      <Text style={styles.matchTime}>
                        {new Date(item.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    )}
                  </View>
                  <View style={styles.matchBottom}>
                    <Text style={styles.lastMessage} numberOfLines={1}>
                      {item.lastMessage?.text || t('chatEmpty')}
                    </Text>
                    {item.unread > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{item.unread}</Text>
                      </View>
                    )}
                  </View>
                  {sharedHobbies.length > 0 && (
                    <Text style={styles.sharedHobbies}>
                      ✨ {sharedHobbies.map((h) => getLocalizedHobby(h, locale)).join(' · ')} {t('chatSharedHobbies')}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchRooms(); }}
              tintColor={Colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grayLight,
  },
  title: { fontSize: 20, fontWeight: 'bold', color: Colors.white },
  sub: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: Colors.white, fontSize: 17, fontWeight: '600' },
  emptyHint: { color: Colors.textMuted, fontSize: 13, marginTop: 6 },
  list: { padding: 16, gap: 8 },
  matchCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.grayLight,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.grayLight,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 52, height: 52, borderRadius: 26 },
  avatarEmoji: { fontSize: 24 },
  matchInfo: { flex: 1, gap: 4 },
  matchTop: { flexDirection: 'row', justifyContent: 'space-between' },
  matchName: { color: Colors.white, fontSize: 15, fontWeight: '600' },
  matchTime: { color: Colors.textMuted, fontSize: 12 },
  matchBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lastMessage: { color: Colors.textMuted, fontSize: 13, flex: 1 },
  unreadBadge: {
    backgroundColor: Colors.primary,
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  unreadText: { color: Colors.white, fontSize: 11, fontWeight: 'bold' },
  sharedHobbies: { color: Colors.primaryLight, fontSize: 11 },
});
