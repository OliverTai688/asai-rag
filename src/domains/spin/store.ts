"use client";

import { create } from "zustand";
import { SpinSession, SpinMessage, SpinPhase } from "./types";
import { demoSeedSpinMessages, demoSeedSpinSessions } from "@/domains/demo/seed-fixtures";

interface SpinState {
  sessions: SpinSession[];
  messagesBySession: Record<string, SpinMessage[]>;
  
  // Actions
  createSession: (clientId: string, clientName: string) => SpinSession;
  addMessage: (sessionId: string, message: SpinMessage) => void;
  updateSession: (sessionId: string, updates: Partial<SpinSession>) => void;
  recordTransition: (sessionId: string, from: SpinPhase, to: SpinPhase, trigger: "AI" | "USER") => void;
  addOutput: (sessionId: string, phase: SpinPhase, content: string) => void;
  getSessionById: (id: string) => SpinSession | undefined;
  getMessages: (sessionId: string) => SpinMessage[];
  clearAll: () => void;
}

export const useSpinStore = create<SpinState>()((set, get) => ({
  sessions: demoSeedSpinSessions,
  messagesBySession: demoSeedSpinMessages,

  createSession: (clientId, clientName) => {
    const id = `spin_${Date.now()}`;
    const newSession: SpinSession = {
      id,
      clientId,
      clientName,
      phase: "SITUATION",
      mode: "SELF_CLARIFY",
      outputs: {
        SITUATION: [],
        PROBLEM: [],
        IMPLICATION: [],
        NEED_PAYOFF: [],
      },
      transitions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({
      sessions: [newSession, ...state.sessions],
      messagesBySession: {
        ...state.messagesBySession,
        [id]: [],
      },
    }));

    return newSession;
  },

  addMessage: (sessionId, message) => {
    set((state) => {
      const sessionMessages = state.messagesBySession[sessionId] || [];
      return {
        messagesBySession: {
          ...state.messagesBySession,
          [sessionId]: [...sessionMessages, message],
        },
      };
    });
  },

  updateSession: (sessionId, updates) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? { ...s, ...updates, updatedAt: new Date().toISOString() }
          : s
      ),
    }));
  },

  recordTransition: (sessionId, from, to, trigger) => {
    const transition = { from, to, trigger, timestamp: new Date().toISOString() };
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              transitions: [...(s.transitions || []), transition],
              updatedAt: new Date().toISOString(),
            }
          : s
      ),
    }));
  },

  addOutput: (sessionId, phase, content) => {
    if (phase === "COMPLETE") return;
    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id !== sessionId) return s;
        const currentOutputs = s.outputs?.[phase] || [];
        if (currentOutputs.includes(content)) return s;
        return {
          ...s,
          outputs: {
            ...s.outputs,
            [phase]: [...currentOutputs, content],
          },
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
  },

  getSessionById: (id) => {
    return get().sessions.find((s) => s.id === id);
  },

  getMessages: (sessionId) => {
    return get().messagesBySession[sessionId] || [];
  },

  clearAll: () => set({ sessions: [], messagesBySession: {} }),
}));
