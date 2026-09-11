import { create } from 'zustand';

/**
 * Purely in-memory (not persisted) UI state shared across the dashboard
 * chrome. Currently just the mobile sidebar drawer — Topbar toggles it,
 * Sidebar reads it, and neither needs to be a parent of the other.
 */
interface UIState {
  mobileSidebarOpen: boolean;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  mobileSidebarOpen: false,
  toggleMobileSidebar: () => set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),
  closeMobileSidebar: () => set({ mobileSidebarOpen: false }),
}));
