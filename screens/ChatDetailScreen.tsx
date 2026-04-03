import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
  ActivityIndicator, Image,
} from 'react-native';
import { Colors } from '../constants/colors';
import { useLocale } from '../hooks/useLocale';
import { JOB_OPTIONS, getLocalizedHobby, translateOption } from '../constants/options';
import { Alert } from 'react-native';
import { chatAPI, userAPI } from '../services/api';
import { joinChatRoom, leaveChatRoom, getSocket } from '../services/socket';

type Message = {
  id: string;
  text: string;
  sender_id: string;
  created_at: string;
};

type Props = {
  roomId: string;
  myUserId: string;
  partner: {
    id: string;
    height: number;
    job: string;
    photoUrl?: string;
    sharedHobbies: string[];
    birthYear?: number;
  };
  onBack: () => void;
};

function formatTime(isoString: string, locale: string, t: (k: any) => string): string {
  const d = new Date(isoString);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  if (locale !== 'ko') return `${h}:${m}`;
  const hh = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h >= 12 ? t('pmText') : t('amText')} ${hh}:${m}`;
}

export default function ChatDetailScreen({ roomId, myUserId, partner, onBack }: Props) {
  const { t, locale } = useLocale();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await chatAPI.getMessages(roomId);
      if (res.ok) setMessages(res.messages || []);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchMessages();
    joinChatRoom(roomId);

    const socket = getSocket();
    const handler = (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    };
    socket?.on('new_message', handler);

    return () => {
      socket?.off('new_message', handler);
      leaveChatRoom(roomId);
    };
  }, [roomId, myUserId, fetchMessages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');
    try {
      const res = await chatAPI.sendMessage(roomId, text);
      if (res.ok) {
        const newMsg: Message = {
          id: res.messageId,
          text,
          sender_id: myUserId,
          created_at: res.createdAt || new Date().toISOString(),
        };
        setMessages((prev) => [...prev, newMsg]);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        {partner.photoUrl ? (
          <Image source={{ uri: partner.photoUrl }} style={styles.headerAvatar} />
        ) : (
          <View style={styles.headerAvatarPlaceholder}>
            <Text style={{ fontSize: 18 }}>👤</Text>
          </View>
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>
            {partner.birthYear ? `${new Date().getFullYear() - partner.birthYear}${t('ageSuffix')} · ` : ''}{partner.height}cm · {translateOption(partner.job, JOB_OPTIONS, t)}
          </Text>
          {partner.sharedHobbies.length > 0 && (
            <Text style={styles.headerSub}>
              ✨ {partner.sharedHobbies.slice(0, 2).map((h) => getLocalizedHobby(h, locale)).join(', ')} {t('chatSharedHobbies')}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={() => Alert.alert('', '', [
          { text: '신고', onPress: () => {
            Alert.alert('신고', '신고 사유를 선택해주세요', [
              { text: '불쾌한 메시지', onPress: async () => { await userAPI.report(partner.id, '불쾌한 메시지'); Alert.alert('신고 완료', '신고가 접수됐습니다'); } },
              { text: '스팸/광고', onPress: async () => { await userAPI.report(partner.id, '스팸/광고'); Alert.alert('신고 완료', '신고가 접수됐습니다'); } },
              { text: '사칭', onPress: async () => { await userAPI.report(partner.id, '사칭'); Alert.alert('신고 완료', '신고가 접수됐습니다'); } },
              { text: '취소', style: 'cancel' },
            ]);
          }},
          { text: '차단', style: 'destructive', onPress: () => {
            Alert.alert('차단', '이 사용자를 차단하면 서로 보이지 않습니다', [
              { text: '취소', style: 'cancel' },
              { text: '차단', style: 'destructive', onPress: async () => { await userAPI.block(partner.id); Alert.alert('차단 완료'); onBack(); } },
            ]);
          }},
          { text: '취소', style: 'cancel' },
        ])}>
          <Text style={{ color: Colors.textMuted, fontSize: 22, paddingLeft: 4 }}>⋯</Text>
        </TouchableOpacity>
        <View style={styles.onlineDot} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => listRef.current?.scrollToEnd()}
            renderItem={({ item, index }) => {
              const isMine = item.sender_id === myUserId;
              const showTime =
                index === messages.length - 1 ||
                (messages[index + 1]?.sender_id !== item.sender_id);
              return (
                <View style={[styles.msgRow, isMine && styles.msgRowMine]}>
                  {!isMine && (
                    <View style={styles.partnerAvatar}>
                      <Text style={{ fontSize: 16 }}>👤</Text>
                    </View>
                  )}
                  <View style={styles.msgCol}>
                    <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubblePartner]}>
                      <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>
                        {item.text}
                      </Text>
                    </View>
                    {showTime && (
                      <Text style={[styles.msgTime, isMine && styles.msgTimeMine]}>
                        {formatTime(item.created_at, locale, t)}
                      </Text>
                    )}
                  </View>
                </View>
              );
            }}
          />
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={t('chatInputPlaceholder')}
            placeholderTextColor={Colors.gray}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={300}
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!input.trim() || sending}
          >
            <Text style={styles.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grayLight,
    gap: 12,
  },
  backBtn: { color: Colors.primaryLight, fontSize: 22, paddingRight: 4 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },
  headerAvatarPlaceholder: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.grayLight, alignItems: 'center', justifyContent: 'center',
  },
  headerInfo: { flex: 1 },
  headerName: { color: Colors.white, fontSize: 15, fontWeight: '600' },
  headerSub: { color: Colors.primaryLight, fontSize: 12, marginTop: 2 },
  onlineDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#4CAF50',
  },

  messageList: { padding: 16, gap: 8 },

  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 4,
  },
  msgRowMine: { flexDirection: 'row-reverse' },
  partnerAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.grayLight,
    alignItems: 'center', justifyContent: 'center',
  },
  msgCol: { maxWidth: '72%', gap: 3 },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubblePartner: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.grayLight,
  },
  bubbleMine: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleText: { color: Colors.white, fontSize: 15, lineHeight: 21 },
  bubbleTextMine: { color: Colors.white },
  msgTime: { color: Colors.textMuted, fontSize: 11, marginLeft: 4 },
  msgTimeMine: { textAlign: 'right', marginRight: 4 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.grayLight,
    backgroundColor: Colors.surface,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.grayLight,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.white,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.grayLight },
  sendBtnText: { color: Colors.white, fontSize: 20, fontWeight: 'bold' },
});
