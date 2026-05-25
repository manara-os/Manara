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
  config.headers['X-App-Variant'] = 'vendor';
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
};

export const vendorApi = {
  getAssignedTickets: () => apiClient.get('/tickets?assignedToMe=true'),
  getTicket: (id: string) => apiClient.get(`/tickets/${id}`),
  updateStatus: (id: string, status: string) => apiClient.patch(`/tickets/${id}/status`, { status }),
  getHistory: () => apiClient.get('/tickets?status=RESOLVED,CLOSED'),
  getProfile: () => apiClient.get('/vendors/me'),
  getNotifications: () => apiClient.get('/notifications'),
};
