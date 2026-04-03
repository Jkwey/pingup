import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_URL = 'https://pingup-server-production.up.railway.app';

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem('token');
}

async function request(path: string, options: RequestInit = {}) {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  return res.json();
}

/* ── 인증 ── */
export const authAPI = {
  sendCode: (phone: string) =>
    request('/auth/send-code', { method: 'POST', body: JSON.stringify({ phone }) }),

  verify: (phone: string, code: string) =>
    request('/auth/verify', { method: 'POST', body: JSON.stringify({ phone, code }) }),

  firebaseVerify: (idToken: string) =>
    request('/auth/firebase', { method: 'POST', body: JSON.stringify({ idToken }) }),
};

/* ── 유저 ── */
export const userAPI = {
  saveProfile: (profile: {
    nickname: string; height: number; gender: string; interestGender: string;
    job: string; smoking: string; drinking: string; hobbies: string[];
    bio: string; photoUrl?: string; locale: string; birthYear?: number;
  }) => request('/users/profile', { method: 'POST', body: JSON.stringify(profile) }),

  getMe: () => request('/users/me'),

  getNearby: (latitude: number, longitude: number, distance?: number) =>
    request(`/users/nearby?latitude=${latitude}&longitude=${longitude}&distance=${distance ?? 500}`),

  updateLocation: (latitude: number, longitude: number) =>
    request('/users/location', { method: 'POST', body: JSON.stringify({ latitude, longitude }) }),

  updateSettings: (settings: { delayedPing?: boolean; distance?: number; locale?: string }) =>
    request('/users/settings', { method: 'PATCH', body: JSON.stringify(settings) }),

  getStats: () => request('/users/stats'),

  savePushToken: (token: string) =>
    request('/users/push-token', { method: 'POST', body: JSON.stringify({ token }) }),

  addHearts: (amount: number, productId: string, transactionId: string) =>
    request('/users/hearts', { method: 'POST', body: JSON.stringify({ amount, productId, transactionId }) }),

  deleteAccount: () => request('/users/me', { method: 'DELETE' }),

  report: (targetId: string, reason: string) =>
    request('/users/report', { method: 'POST', body: JSON.stringify({ targetId, reason }) }),

  block: (targetId: string) =>
    request('/users/block', { method: 'POST', body: JSON.stringify({ targetId }) }),

  uploadPhoto: async (uri: string): Promise<{ ok: boolean; photoUrl?: string }> => {
    const token = await AsyncStorage.getItem('token');
    const formData = new FormData();
    formData.append('photo', {
      uri,
      name: 'profile.jpg',
      type: 'image/jpeg',
    } as any);

    const res = await fetch(`${API_URL}/users/photo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    return res.json();
  },
};

/* ── 핑 ── */
export const pingAPI = {
  send: (receiverId: string, message: string) =>
    request('/pings/send', { method: 'POST', body: JSON.stringify({ receiverId, message }) }),

  getReceived: () => request('/pings/received'),

  accept: (pingId: string) =>
    request(`/pings/${pingId}/accept`, { method: 'POST' }),

  reject: (pingId: string) =>
    request(`/pings/${pingId}/reject`, { method: 'POST' }),
};

/* ── 어드민 ── */
export const adminAPI = {
  getUsers: () => request('/admin/users'),

  banUser: (userId: string, reason?: string) =>
    request(`/admin/users/${userId}/ban`, { method: 'POST', body: JSON.stringify({ reason }) }),

  unbanUser: (userId: string) =>
    request(`/admin/users/${userId}/unban`, { method: 'POST' }),

  deletePhoto: (userId: string) =>
    request(`/admin/users/${userId}/photo`, { method: 'DELETE' }),
};

/* ── 채팅 ── */
export const chatAPI = {
  getRooms: () => request('/chat/rooms'),

  getMessages: (roomId: string, cursor?: string) =>
    request(`/chat/rooms/${roomId}/messages${cursor ? `?cursor=${cursor}` : ''}`),

  sendMessage: (roomId: string, text: string) =>
    request(`/chat/rooms/${roomId}/messages`, { method: 'POST', body: JSON.stringify({ text }) }),
};
