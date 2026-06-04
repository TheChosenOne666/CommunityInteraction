import { create } from 'zustand';
import { LoginUserVO } from '../types';

interface AppState {
  user: LoginUserVO | null;
  isLoading: boolean;
  setUser: (user: LoginUserVO | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ isLoading: loading }),
  logout: () => set({ user: null }),
}));
