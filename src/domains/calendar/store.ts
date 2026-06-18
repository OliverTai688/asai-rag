import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CalendarState, CalendarEvent } from "./types";

interface CalendarActions {
  setEvents: (events: CalendarEvent[]) => void;
  addEvent: (event: CalendarEvent) => void;
  setGoogleConnected: (connected: boolean) => void;
}

export const useCalendarStore = create<CalendarState & CalendarActions>()(
  persist(
    (set) => ({
      events: [
        {
          id: "1",
          title: "王大明 - SPIN 需求分析訪談",
          start: new Date(new Date().setHours(10, 30, 0, 0)).toISOString(),
          end: new Date(new Date().setHours(11, 30, 0, 0)).toISOString(),
          type: "MEETING",
          status: "CONFIRMED",
          source: "INTERNAL",
        },
        {
          id: "2",
          title: "蔡佩芬 - 加保合約簽署",
          start: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString(),
          end: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString(),
          type: "MEETING",
          status: "CONFIRMED",
          source: "INTERNAL",
        },
        {
          id: "3",
          title: "季度團隊目標回顧",
          start: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(),
          end: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(),
          type: "MEETING",
          status: "TENTATIVE",
          source: "INTERNAL",
        }
      ],
      isGoogleConnected: false,

      setEvents: (events) => set({ events }),
      addEvent: (event) => set((state) => ({ events: [...state.events, event] })),
      setGoogleConnected: (connected) => set({ isGoogleConnected: connected }),
    }),
    {
      name: "sincerely:v1:calendar",
      partialize: (state) => ({ isGoogleConnected: state.isGoogleConnected }),
    }
  )
);
