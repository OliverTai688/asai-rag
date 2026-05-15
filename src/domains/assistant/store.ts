"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { AssistantMessage, AssistantSuggestion, AppNotification, Conversation } from "./types";

function generateTitle(messages: AssistantMessage[]): string {
  const firstUser = messages.find(m => m.role === 'user');
  if (!firstUser) return '新對話';
  const text = firstUser.content;
  return text.length > 28 ? text.slice(0, 28) + '...' : text;
}

function newConversation(): Conversation {
  const now = new Date().toISOString();
  return { id: Date.now().toString(), title: '新對話', messages: [], createdAt: now, updatedAt: now };
}

interface AssistantState {
  conversations: Conversation[];
  activeConversationId: string | null;
  suggestions: AssistantSuggestion[];
  notifications: AppNotification[];
  isPanelOpen: boolean;

  addMessage: (message: AssistantMessage) => void;
  updateLastMessage: (content: string) => void;
  replaceLastMessage: (message: AssistantMessage) => void;
  createConversation: () => string;
  switchConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  addNotification: (notif: AppNotification) => void;
  markAsRead: (id: string) => void;
  setSuggestions: (suggestions: AssistantSuggestion[]) => void;
  togglePanel: (open?: boolean) => void;
}

export const useAssistantStore = create<AssistantState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,
      suggestions: [],
      notifications: [],
      isPanelOpen: false,

      addMessage: (message) => {
        set((state) => {
          let convId = state.activeConversationId;
          let conversations = state.conversations;

          if (!convId || !conversations.find(c => c.id === convId)) {
            const conv = newConversation();
            convId = conv.id;
            conversations = [conv, ...conversations];
          }

          return {
            activeConversationId: convId,
            conversations: conversations.map(c => {
              if (c.id !== convId) return c;
              const msgs = [...c.messages, message];
              return { ...c, messages: msgs, title: generateTitle(msgs), updatedAt: new Date().toISOString() };
            }),
          };
        });
      },

      updateLastMessage: (content) => {
        set((state) => ({
          conversations: state.conversations.map(c => {
            if (c.id !== state.activeConversationId) return c;
            const last = c.messages[c.messages.length - 1];
            if (!last) return c;
            return { ...c, messages: [...c.messages.slice(0, -1), { ...last, content }], updatedAt: new Date().toISOString() };
          }),
        }));
      },

      replaceLastMessage: (message) => {
        set((state) => ({
          conversations: state.conversations.map(c => {
            if (c.id !== state.activeConversationId) return c;
            return { ...c, messages: [...c.messages.slice(0, -1), message], updatedAt: new Date().toISOString() };
          }),
        }));
      },

      createConversation: () => {
        const conv = newConversation();
        set((state) => ({
          conversations: [conv, ...state.conversations],
          activeConversationId: conv.id,
        }));
        return conv.id;
      },

      switchConversation: (id) => set({ activeConversationId: id }),

      deleteConversation: (id) => {
        set((state) => {
          const remaining = state.conversations.filter(c => c.id !== id);
          const newActiveId = state.activeConversationId === id
            ? (remaining[0]?.id ?? null)
            : state.activeConversationId;
          return { conversations: remaining, activeConversationId: newActiveId };
        });
      },

      addNotification: (notif) => {
        set((state) => ({ notifications: [notif, ...state.notifications] }));
      },

      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map(n => n.id === id ? { ...n, isRead: true } : n),
        }));
      },

      setSuggestions: (suggestions) => set({ suggestions }),

      togglePanel: (open) => set((state) => ({
        isPanelOpen: open !== undefined ? open : !state.isPanelOpen,
      })),
    }),
    {
      name: "sincerely:v2:assistant",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
