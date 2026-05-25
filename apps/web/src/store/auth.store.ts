import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authApi } from '@/lib/api';

interface Workspace {
  workspaceId: string;
  role: string;
  workspace: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
    countryCode: string;
    currencyCode: string;
    status: string;
    subscriptionPlan: string;
  };
}

interface User {
  id: string;
  phone: string;
  email?: string;
  fullName?: string;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  isAuthenticated: boolean;
  isLoading: boolean;
  hasHydrated: boolean;

  // Actions
  setAuth: (data: { user: User; accessToken: string; refreshToken: string; workspaces: Workspace[] }) => void;
  setCurrentWorkspace: (workspace: Workspace) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  setHasHydrated: (hydrated: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      currentWorkspace: null,
      workspaces: [],
      isAuthenticated: false,
      isLoading: false,
      hasHydrated: false,

      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),

      setAuth: ({ user, accessToken, refreshToken, workspaces }) => {
        localStorage.setItem('manara_access_token', accessToken);
        localStorage.setItem('manara_refresh_token', refreshToken);

        const primaryWorkspace = workspaces[0] || null;
        if (primaryWorkspace) {
          localStorage.setItem('manara_workspace_id', primaryWorkspace.workspaceId);
        }

        set({
          user,
          accessToken,
          refreshToken,
          workspaces,
          currentWorkspace: primaryWorkspace,
          isAuthenticated: true,
        });
      },

      setCurrentWorkspace: (workspace) => {
        localStorage.setItem('manara_workspace_id', workspace.workspaceId);
        set({ currentWorkspace: workspace });
      },

      logout: () => {
        localStorage.removeItem('manara_access_token');
        localStorage.removeItem('manara_refresh_token');
        localStorage.removeItem('manara_workspace_id');
        authApi.logout().catch(() => {});
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          currentWorkspace: null,
          workspaces: [],
          isAuthenticated: false,
        });
      },

      updateUser: (userData) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        }));
      },
    }),
    {
      name: 'manara-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        currentWorkspace: state.currentWorkspace,
        workspaces: state.workspaces,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
