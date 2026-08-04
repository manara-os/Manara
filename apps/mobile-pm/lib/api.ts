import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:3001/api/v1';

const apiClient = axios.create({
  baseURL: API_URL,
  // The API sleeps when idle and takes roughly a minute to come back. A 30s
  // timeout guaranteed that the first request after a quiet spell was killed
  // before the server had finished waking.
  timeout: 90000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('manara_access_token');
  const workspaceId = await AsyncStorage.getItem('manara_workspace_id');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (workspaceId) config.headers['X-Workspace-ID'] = workspaceId;
  config.headers['X-App-Variant'] = 'pm-staff';
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

// Helper to safely unwrap API envelopes — backend wraps responses as { success, data }.
// Paginated collections are wrapped twice: { success, data: { data: [...], meta } },
// and only some endpoints paginate — /tickets returns a bare array while /leases
// and /properties do not. Unwrapping one level therefore hands screens an object
// where they expect an array, and `.filter` / `.length` silently fall over.
const unwrap = <T>(p: Promise<any>): Promise<T> =>
  p.then((r) => {
    const body = r && typeof r === 'object' && 'data' in r ? r.data : r;
    if (body && typeof body === 'object' && !Array.isArray(body) && Array.isArray(body.data)) {
      return body.data;
    }
    return body;
  });

export const authApi = {
  sendOtp: (phone: string) => apiClient.post('/auth/send-otp', { phone }),
  verifyOtp: (phone: string, code: string) => apiClient.post('/auth/verify-otp', { phone, code }),
};

// Unified PM Staff API — covers full property management surface
export const pmApi = {
  // Dashboard KPIs
  getDashboard: () => unwrap<any>(apiClient.get('/reports/dashboard')),

  // Properties
  getProperties: () => unwrap<any[]>(apiClient.get('/properties')),
  getProperty: (id: string) => unwrap<any>(apiClient.get(`/properties/${id}`)),

  // Tenants
  getTenants: () => unwrap<any[]>(apiClient.get('/tenants')),
  getTenant: (id: string) => unwrap<any>(apiClient.get(`/tenants/${id}`)),

  // Leases
  getLeases: (params?: { status?: string; expiringIn?: number }) =>
    unwrap<any[]>(apiClient.get('/leases', { params })),
  getLease: (id: string) => unwrap<any>(apiClient.get(`/leases/${id}`)),
  advanceMoveIn: (id: string, status: 'ONGOING' | 'COMPLETE') =>
    apiClient.patch(`/leases/${id}/move-in`, { status }),

  // Tickets (Maintenance)
  getTickets: (params?: { status?: string; priority?: string }) =>
    unwrap<any[]>(apiClient.get('/tickets', { params })),
  getTicket: (id: string) => unwrap<any>(apiClient.get(`/tickets/${id}`)),
  assignTicket: (id: string, vendorId: string) =>
    apiClient.patch(`/tickets/${id}/assign`, { vendorId }),
  updateTicketStatus: (id: string, status: string) =>
    apiClient.patch(`/tickets/${id}/status`, { status }),

  // Owners (PMA)
  getOwners: () => unwrap<any[]>(apiClient.get('/owners')),
  getOwner: (id: string) => unwrap<any>(apiClient.get(`/owners/${id}`)),

  // Finance
  getCollections: () => unwrap<any[]>(apiClient.get('/finance/collections')),
  getPdcCheques: () => unwrap<any[]>(apiClient.get('/finance/pdc-cheques')),
  getOverdue: () => unwrap<any[]>(apiClient.get('/finance/overdue')),

  // Vendors
  getVendors: () => unwrap<any[]>(apiClient.get('/vendors')),

  // Me
  // /users/me does not exist — the API exposes the current user under /auth/me,
  // which is what the owner and tenant apps already call.
  getProfile: () => unwrap<any>(apiClient.get('/auth/me')),

  // ── Production-push endpoints ─────────────────────────────────────
  // Compliance
  getCompliance: () => unwrap<any[]>(apiClient.get('/compliance')),
  getComplianceKpis: () => unwrap<any>(apiClient.get('/compliance/kpis')),
  renewCompliance: (id: string, newExpiryDate: string) =>
    apiClient.post(`/compliance/${id}/renew`, { newExpiryDate }),

  // Reviews + NPS
  getReviews: (params?: any) => unwrap<any[]>(apiClient.get('/reviews', { params })),
  getReviewsDashboard: () => unwrap<any>(apiClient.get('/reviews/dashboard')),
  respondReview: (id: string, response: string) => apiClient.post(`/reviews/${id}/respond`, { response }),
  dispatchNps: (campaignName?: string) => apiClient.post('/nps/dispatch', { campaignName }),

  // Vendor scores
  getVendorLeaderboard: (period?: '30D' | '90D' | 'YTD') =>
    unwrap<any[]>(apiClient.get('/vendor-scores/leaderboard', { params: period ? { period } : {} })),

  // Bids
  getBidsForTicket: (ticketId: string) => unwrap<any>(apiClient.get(`/bids/ticket/${ticketId}`)),
  acceptBid: (bidId: string) => apiClient.post(`/bids/${bidId}/accept`),

  // Receipts (approve on behalf of owner)
  getReceipts: (ownerId: string) => unwrap<any>(apiClient.get('/receipts', { params: { ownerId } })),

  // WhatsApp
  getWhatsAppThread: (recipientType: 'tenant' | 'owner' | 'vendor', recipientId: string) =>
    unwrap<any[]>(apiClient.get('/whatsapp/thread', { params: { recipientType, recipientId } })),
  sendWhatsApp: (data: any) => apiClient.post('/whatsapp/send', data),
};
