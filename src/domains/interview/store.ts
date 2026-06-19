"use client";

import { create } from "zustand";
import {
  addInterviewAnswer,
  addInterviewMaterial,
  advanceInterviewSegment,
  createInterviewSession,
  getInterviewOutline,
  listInterviewOutlines,
} from "./service";
import { InterviewAnswer, InterviewMaterial, InterviewMode, InterviewOutline, InterviewSession } from "./types";

interface InterviewState {
  outlines: InterviewOutline[];
  sessions: InterviewSession[];
  activeSessionId: string | null;

  createSession: (params?: { mode?: InterviewMode; clientId?: string; visitPlanId?: string }) => InterviewSession;
  setActiveSession: (sessionId: string) => void;
  addAnswer: (sessionId: string, answer: Omit<InterviewAnswer, "id" | "createdAt">) => void;
  addMaterial: (sessionId: string, material: Omit<InterviewMaterial, "id" | "createdAt">) => void;
  advanceSegment: (sessionId: string) => void;
  getSessionById: (sessionId: string) => InterviewSession | undefined;
}

export const useInterviewStore = create<InterviewState>()((set, get) => ({
  outlines: listInterviewOutlines(),
  sessions: [],
  activeSessionId: null,

  createSession: (params) => {
    const session = createInterviewSession(params);
    set((state) => ({
      sessions: [session, ...state.sessions],
      activeSessionId: session.id,
    }));
    return session;
  },

  setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),

  addAnswer: (sessionId, answer) => {
    set((state) => ({
      sessions: state.sessions.map((session) => (
        session.id === sessionId ? addInterviewAnswer(session, answer) : session
      )),
    }));
  },

  addMaterial: (sessionId, material) => {
    set((state) => ({
      sessions: state.sessions.map((session) => (
        session.id === sessionId ? addInterviewMaterial(session, material) : session
      )),
    }));
  },

  advanceSegment: (sessionId) => {
    set((state) => ({
      sessions: state.sessions.map((session) => {
        if (session.id !== sessionId) return session;
        const outline = getInterviewOutline(session.outlineId);
        return outline ? advanceInterviewSegment(outline, session) : session;
      }),
    }));
  },

  getSessionById: (sessionId) => get().sessions.find((session) => session.id === sessionId),
}));
