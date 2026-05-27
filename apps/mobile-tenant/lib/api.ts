import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:3001/api/v1';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('manara_access_token');
  const workspaceId = await AsyncStorage.getItem('manara_workspace_id');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (workspaceId) config.headers['X-Workspace-ID'] = workspaceId;
  config.headers['X-App-Variant'] = 'tenant';
  return config;
});

apiClient.interceptors.response.use(
  (r) => r.data,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['manara_access_token', 'manara_refresh_token', 'manara_workspace_id']);
    }
    return Promise.reject(error.response?.data ?? error);
  },
);

export const authApi = {
  sendOtp: (phone: string) => apiClient.post('/auth/send-otp', { phone }),
  verifyOtp: (phone: string, code: string) => apiClient.post('/auth/verify-otp', { phone, code }),
  me: () => apiClient.get('/auth/me'),
};

export const tenantApi = {
  getMyLease: () => apiClient.get('/leases?limit=1').then((r: any) => (Array.isArray(r) ? r[0] : Array.isArray(r?.data) ? r.data[0] : r)),
  getNotifications: () => apiClient.get('/notifications'),
  markNotificationRead: (id: string) => apiClient.patch(`/notifications/${id}/read`),
  markAllNotificationsRead: () => apiClient.post('/notifications/mark-all-read'),
  getPayments: () => apiClient.get('/finance/cheques'),
  getMyTickets: () => apiClient.get('/tickets'),
  createTicket: (data: any) => apiClient.post('/tickets', data),
  getDocuments: () => apiClient.get('/documents'),
  registerPushToken: (token: string, provider: string) =>
    apiClient.post('/push-tokens', { token, provider, appVariant: 'tenant' }),
};

// ── Production-push endpoints (tenant) ─────────────────────────────
export const aecbApi = {
  history: (tenantId: string) => apiClient.get(`/aecb/tenants/${tenantId}`),
  optIn: (tenantId: string, optIn: boolean) => apiClient.post(`/aecb/tenants/${tenantId}/opt-in`, { optIn }),
};

export const whatsappApi = {
  thread: (recipientType: 'tenant' | 'owner' | 'vendor', recipientId: string) =>
    apiClient.get('/whatsapp/thread', { params: { recipientType, recipientId } }),
  send: (data: any) => apiClient.post('/whatsapp/send', data),
};

export const reviewsApi = {
  submit: (data: any) => apiClient.post('/reviews', data),
};

export const npsApi = {
  respond: (id: string, score: number, comment?: string) => apiClient.post(`/nps/${id}/respond`, { score, comment }),
};
