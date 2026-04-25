"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { AssistantMessage, AssistantSuggestion, AppNotification } from "./types";

interface AssistantState {
  messages: AssistantMessage[];
  suggestions: AssistantSuggestion[];
  notifications: AppNotification[];
  isPanelOpen: boolean;

  // Actions
  addMessage: (message: AssistantMessage) => void;
  clearMessages: () => void;
  addNotification: (notif: AppNotification) => void;
  markAsRead: (id: string) => void;
  setSuggestions: (suggestions: AssistantSuggestion[]) => void;
  togglePanel: (open?: boolean) => void;
}

export const useAssistantStore = create<AssistantState>()(
  persist(
    (set, get) => ({
      messages: [],
      suggestions: [],
      notifications: [],
      isPanelOpen: false,

      addMessage: (message) => {
        set((state) => ({ messages: [...state.messages, message] }));
      },

      clearMessages: () => set({ messages: [] }),

      addNotification: (notif) => {
        set((state) => ({ notifications: [notif, ...state.notifications] }));
      },

      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) => 
            n.id === id ? { ...n, isRead: true } : n
          ),
        }));
      },

      setSuggestions: (suggestions) => set({ suggestions }),

      togglePanel: (open) => set((state) => ({ 
        isPanelOpen: open !== undefined ? open : !state.isPanelOpen 
      })),
    }),
    {
      name: "sincerely:v1:assistant",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
