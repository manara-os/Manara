import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

class ApiClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request: attach auth token
    this.instance.interceptors.request.use(
      (config) => {
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('manara_access_token');
          const workspaceId = localStorage.getItem('manara_workspace_id');

          if (token) config.headers.Authorization = `Bearer ${token}`;
          if (workspaceId) config.headers['X-Workspace-ID'] = workspaceId;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response: handle 401 → refresh token
    this.instance.interceptors.response.use(
      (response) => {
        const body = response.data;
        // Unwrap API envelope { success, data, timestamp }
        if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
          return body.data;
        }
        return body;
      },
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('manara_refresh_token');
            if (!refreshToken) throw new Error('No refresh token');

            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
            const { accessToken, refreshToken: newRefreshToken } = response.data.data;

            localStorage.setItem('manara_access_token', accessToken);
            localStorage.setItem('manara_refresh_token', newRefreshToken);

            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return this.instance(originalRequest);
          } catch (refreshError) {
            localStorage.removeItem('manara_access_token');
            localStorage.removeItem('manara_refresh_token');
            localStorage.removeItem('manara_workspace_id');
            localStorage.removeItem('manara-auth');
            window.location.href = '/auth/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error.response?.data || error);
      },
    );
  }

  // The response interceptor above unwraps the `{ success, data }` envelope and
  // resolves to the payload itself, so every call below settles as T rather than
  // AxiosResponse<T>. Axios cannot express that, hence the assertions.
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.get(url, config) as unknown as Promise<T>;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.post(url, data, config) as unknown as Promise<T>;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.patch(url, data, config) as unknown as Promise<T>;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.put(url, data, config) as unknown as Promise<T>;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.delete(url, config) as unknown as Promise<T>;
  }

  async uploadFile<T>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<T> {
    return this.instance.post(url, formData, {
      ...config,
      headers: { ...config?.headers, 'Content-Type': 'multipart/form-data' },
    }) as unknown as Promise<T>;
  }
}

export const api = new ApiClient();

// ── API modules ──────────────────────────────────────────────

export const authApi = {
  sendOtp: (phone: string) => api.post('/auth/send-otp', { phone }),
  verifyOtp: (phone: string, code: string) => api.post('/auth/verify-otp', { phone, code }),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  registerPushToken: (data: any) => api.patch('/auth/push-token', data),
};

export const propertiesApi = {
  list: (params?: any) => api.get('/properties', { params }),
  get: (id: string) => api.get(`/properties/${id}`),
  getOne: (id: string) => api.get(`/properties/${id}`),
  create: (data: any) => api.post('/properties', data),
  update: (id: string, data: any) => api.patch(`/properties/${id}`, data),
  delete: (id: string) => api.delete(`/properties/${id}`),
  getVacancy: (params?: any) => api.get('/properties/vacancy', { params }),
};

export const unitsApi = {
  list: (params?: any) => api.get('/units', { params }),
  listByProperty: (propertyId: string) => api.get(`/properties/${propertyId}/units`),
  get: (id: string) => api.get(`/units/${id}`),
  create: (propertyId: string, data: any) => api.post(`/properties/${propertyId}/units`, data),
  update: (id: string, data: any) => api.patch(`/units/${id}`, data),
};

export const tenantsApi = {
  list: (params?: any) => api.get('/tenants', { params }),
  get: (id: string) => api.get(`/tenants/${id}`),
  getOne: (id: string) => api.get(`/tenants/${id}`),
  getLedger: (id: string) => api.get(`/tenants/${id}/ledger`),
  getStatement: (id: string, startDate: string, endDate: string) =>
    api.get(`/tenants/${id}/statement`, { params: { startDate, endDate } }),
  verifyKyc: (id: string) => api.post(`/tenants/${id}/verify-kyc`),
  updateScreening: (id: string, status: string) =>
    api.patch(`/tenants/${id}/screening`, { status }),
  create: (data: any) => api.post('/tenants', data),
  update: (id: string, data: any) => api.patch(`/tenants/${id}`, data),
};

export const leasesApi = {
  list: (params?: any) => api.get('/leases', { params }),
  get: (id: string) => api.get(`/leases/${id}`),
  getOne: (id: string) => api.get(`/leases/${id}`),
  create: (data: any) => api.post('/leases', data),
  update: (id: string, data: any) => api.patch(`/leases/${id}`, data),
  activate: (id: string) => api.post(`/leases/${id}/activate`),
  renew: (id: string, data: any) => api.post(`/leases/${id}/renew`, data),
  terminate: (id: string, data: any) => api.post(`/leases/${id}/terminate`, data),
  initiateRenewal: (id: string) => api.get(`/leases/${id}/renewal-analysis`),
  getExpiring: (days?: number) => api.get('/leases/expiring', { params: { days } }),
  getOverdue: () => api.get('/leases/overdue'),
  submitEjari: (id: string) => api.post(`/leases/${id}/ejari`),
  getEjariStatus: (id: string) => api.get(`/leases/${id}/ejari-status`),
  reraAnalysis: (id: string) => api.get(`/leases/${id}/rera-analysis`),
  updateMoveInStatus: (id: string, status: string) =>
    api.patch(`/leases/${id}/move-in-status`, { status }),
  submitCommission: (id: string, data: any) => api.post(`/leases/${id}/commission`, data),
  verifyCommission: (id: string) => api.patch(`/leases/${id}/commission/verify`),
  createMoveOut: (id: string, data: any) => api.post(`/leases/${id}/move-out`, data),
  updateMoveOut: (id: string, data: any) => api.patch(`/leases/${id}/move-out`, data),
};

export const ticketsApi = {
  list: (params?: any) => api.get('/tickets', { params }),
  get: (id: string) => api.get(`/tickets/${id}`),
  getOne: (id: string) => api.get(`/tickets/${id}`),
  getBoard: () => api.get('/tickets/board'),
  create: (data: any) => api.post('/tickets', data),
  update: (id: string, data: any) => api.patch(`/tickets/${id}`, data),
  updateStatus: (id: string, status: string, note?: string) => api.patch(`/tickets/${id}/status`, { status, note }),
  assign: (id: string, vendorId: string) => api.post(`/tickets/${id}/assign`, { vendorId }),
  complete: (id: string, data: any) => api.post(`/tickets/${id}/complete`, data),
  rate: (id: string, rating: number, feedback?: string) =>
    api.post(`/tickets/${id}/rate`, { rating, feedback }),
};

export const financeApi = {
  getSummary: () => api.get('/finance/summary'),
  getOverdue: () => api.get('/finance/overdue'),
  getCollections: (params?: any) => api.get('/finance/collections', { params }),
  recordPayment: (data: any) => api.post('/finance/collections', data),
  getPdcCheques: (params?: any) => api.get('/finance/cheques', { params }),
  updateCheque: (id: string, data: any) => api.patch(`/finance/cheques/${id}/status`, data),
  getOwnerSoa: (ownerId: string, params?: any) =>
    api.get(`/finance/owner-soa/${ownerId}`, { params }),
  triggerAiCall: (leaseId: string) => api.post(`/ai/rent-call/${leaseId}`),
  getExpenses: (params?: any) => api.get('/finance/expenses', { params }),
  createExpense: (data: any) => api.post('/finance/expenses', data),
  getRevenue: (params?: any) => api.get('/reports/revenue', { params }),
  listCommissions: (params?: any) => api.get('/finance/commissions', { params }),
};

export const ownersApi = {
  list: (params?: any) => api.get('/owners', { params }),
  get: (id: string) => api.get(`/owners/${id}`),
  getPortfolioById: (id: string) => api.get(`/owners/${id}/portfolio`),
  getInvestorDashboard: (id: string) => api.get(`/owners/${id}/investor-dashboard`),
  getMarketIntel: (id: string) => api.get(`/owners/${id}/market-intel`),
  getStatement: (id: string, startDate: string, endDate: string) =>
    api.get(`/owners/${id}/statement`, { params: { startDate, endDate } }),
  create: (data: any) => api.post('/owners', data),
  update: (id: string, data: any) => api.patch(`/owners/${id}`, data),
  updatePmaStatus: (id: string, status: string) =>
    api.patch(`/owners/${id}/pma-status`, { status }),
  triggerPmaRenewal: (id: string) => api.post(`/owners/${id}/pma-renewal`),
  getPortfolio: () => api.get('/owner/portfolio'),
  getRevenue: (params?: any) => api.get('/owner/revenue', { params }),
  getDocuments: () => api.get('/owner/documents'),
  getRenewals: () => api.get('/owner/renewals'),
  approveRenewal: (id: string) => api.post(`/owner/renewals/${id}/approve`),
  getRoi: (propertyId: string) => api.get(`/owner/roi/${propertyId}`),
  getMarketBenchmark: (unitId: string) => api.get(`/owner/market-benchmark/${unitId}`),
};

export const vendorsApi = {
  list: (params?: any) => api.get('/vendors', { params }),
  get: (id: string) => api.get(`/vendors/${id}`),
  create: (data: any) => api.post('/vendors', data),
  update: (id: string, data: any) => api.patch(`/vendors/${id}`, data),
  getJobs: (params?: any) => api.get('/vendor/jobs', { params }),
  acceptJob: (id: string) => api.patch(`/vendor/jobs/${id}/accept`),
  updateJobStatus: (id: string, data: any) => api.patch(`/vendor/jobs/${id}/status`, data),
  submitInvoice: (id: string, data: any) => api.post(`/vendor/jobs/${id}/invoice`, data),
};

export const notificationsApi = {
  list: (params?: any) => api.get('/notifications', { params }),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  getSettings: () => api.get('/notifications/settings'),
  updateSettings: (data: any) => api.patch('/notifications/settings', data),
};

export const integrationsApi = {
  getReraIndex: (area: string, params?: any) =>
    api.get(`/integrations/rera-index/${area}`, { params }),
  registerEjari: (leaseId: string) => api.post(`/integrations/ejari/register/${leaseId}`),
  getDldTransactions: (params?: any) => api.get('/integrations/dld/transactions', { params }),
  getMortgageEstimate: (params: any) => api.get('/mortgage/estimate', { params }),
};

export const workspacesApi = {
  getCurrent: () => api.get('/workspaces/current'),
  update: (data: any) => api.patch('/workspaces/current', data),
  getMembers: () => api.get('/workspaces/current/members'),
  getStats: () => api.get('/workspaces/current/stats'),
  removeMember: (userId: string) => api.delete(`/workspaces/current/members/${userId}`),
};

export const unitsApiExtra = {
  listVacant: () => api.get('/units/vacant'),
  listByProperty: (propertyId: string) => api.get(`/properties/${propertyId}/units`),
};

export const adminApi = {
  getWorkspaces: (params?: any) => api.get('/admin/workspaces', { params }),
  getWorkspace: (id: string) => api.get(`/admin/workspaces/${id}`),
  createWorkspace: (data: any) => api.post('/admin/workspaces', data),
  updateWorkspace: (id: string, data: any) => api.patch(`/admin/workspaces/${id}`, data),
  suspendWorkspace: (id: string) => api.post(`/admin/workspaces/${id}/suspend`),
  getPlatformStats: () => api.get('/admin/stats'),
  getSubscriptions: () => api.get('/admin/subscriptions'),
};

// ───────────────────────── Production push: 9 new features ─────────────────────────

export const complianceApi = {
  list: (params?: any) => api.get('/compliance', { params }),
  kpis: () => api.get('/compliance/kpis'),
  get: (id: string) => api.get(`/compliance/${id}`),
  create: (data: any) => api.post('/compliance', data),
  update: (id: string, data: any) => api.patch(`/compliance/${id}`, data),
  renew: (id: string, newExpiryDate: string) => api.post(`/compliance/${id}/renew`, { newExpiryDate }),
  delete: (id: string) => api.delete(`/compliance/${id}`),
};

export const receiptsApi = {
  list: (ownerId: string) => api.get('/receipts', { params: { ownerId } }),
  get: (id: string) => api.get(`/receipts/${id}`),
  create: (data: any) => api.post('/receipts', data),
  approve: (id: string) => api.post(`/receipts/${id}/approve`),
  reject: (id: string, reason: string) => api.post(`/receipts/${id}/reject`, { reason }),
  markPaid: (id: string) => api.post(`/receipts/${id}/mark-paid`),
};

export const taxCertificatesApi = {
  list: (ownerId: string) => api.get('/tax-certificates', { params: { ownerId } }),
  generate: (ownerId: string, taxYear: number) => api.post('/tax-certificates/generate', { ownerId, taxYear }),
  email: (id: string, email: string) => api.post(`/tax-certificates/${id}/email`, { email }),
};

export const reviewsApi = {
  list: (params?: any) => api.get('/reviews', { params }),
  dashboard: () => api.get('/reviews/dashboard'),
  create: (data: any) => api.post('/reviews', data),
  respond: (id: string, response: string) => api.post(`/reviews/${id}/respond`, { response }),
  aiDraft: (id: string) => api.post(`/reviews/${id}/ai-draft`),
};

export const npsApi = {
  list: (campaignName?: string) => api.get('/nps', { params: campaignName ? { campaignName } : {} }),
  dispatch: (campaignName?: string) => api.post('/nps/dispatch', { campaignName }),
  respond: (id: string, score: number, comment?: string) => api.post(`/nps/${id}/respond`, { score, comment }),
};

export const bidsApi = {
  forTicket: (ticketId: string) => api.get(`/bids/ticket/${ticketId}`),
  submit: (ticketId: string, data: any) => api.post(`/bids/ticket/${ticketId}`, data),
  accept: (bidId: string) => api.post(`/bids/${bidId}/accept`),
  reject: (bidId: string) => api.post(`/bids/${bidId}/reject`),
  withdraw: (bidId: string) => api.post(`/bids/${bidId}/withdraw`),
};

export const vendorScoresApi = {
  leaderboard: (period?: '30D' | '90D' | 'YTD') => api.get('/vendor-scores/leaderboard', { params: period ? { period } : {} }),
  recompute: () => api.post('/vendor-scores/recompute'),
};

export const vendorWalletApi = {
  get: (vendorId: string) => api.get(`/vendors/${vendorId}/wallet`),
};

export const aecbApi = {
  history: (tenantId: string) => api.get(`/aecb/tenants/${tenantId}`),
  optIn: (tenantId: string, optIn: boolean) => api.post(`/aecb/tenants/${tenantId}/opt-in`, { optIn }),
  queueMonthly: (month?: string) => api.post('/aecb/queue-monthly', { month }),
};

export const whatsappApi = {
  thread: (recipientType: 'tenant' | 'owner' | 'vendor', recipientId: string) =>
    api.get('/whatsapp/thread', { params: { recipientType, recipientId } }),
  send: (data: any) => api.post('/whatsapp/send', data),
  markRead: (id: string) => api.post(`/whatsapp/${id}/read`),
};

export const roiApi = {
  scenarios: () => api.get('/roi/scenarios'),
  simulate: (data: any) => api.post('/roi/simulate', data),
};

export const teamApi = {
  list: () => api.get('/team'),
  matrix: () => api.get('/team/escalation-matrix'),
};
