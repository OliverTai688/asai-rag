"use client";

import { create } from "zustand";

export type UserRole = "OWNER" | "MANAGER" | "AGENT";

interface User {
  id: string;
  name: string;
  role: UserRole;
  orgId: string;
  avatar?: string;
  region: string;
}

interface SessionState {
  user: User | null;
  isAuthenticated: boolean;
  
  // Actions
  login: (user: User) => void;
  logout: () => void;
  switchRole: (role: UserRole) => void;
}

const DEFAULT_USER: User = {
  id: "u_agent_01",
  name: "王小明",
  role: "AGENT",
  orgId: "org_tpe_01",
  region: "台北一區",
};

export const useSessionStore = create<SessionState>()((set) => ({
  user: DEFAULT_USER,
  isAuthenticated: true,

  login: (user) => set({ user, isAuthenticated: true }),
  logout: () => set({ user: null, isAuthenticated: false }),
  switchRole: (role) => set((state) => ({
    user: state.user ? { ...state.user, role } : null,
  })),
}));
