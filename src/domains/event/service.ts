import { useEventStore } from "./store";
import { InteractionEvent, EventType } from "./types";
import { nanoid } from "nanoid";

export const eventService = {
  getLatestEvents: (limit: number = 8) => {
    return useEventStore.getState().getLatestEvents(limit);
  },

  getEventsByClientId: (clientId: string) => {
    return useEventStore.getState().getEventsByClientId(clientId);
  },

  trackEvent: (clientId: string, clientName: string, type: EventType, title: string, description: string, metadata?: Record<string, any>) => {
    const newEvent: InteractionEvent = {
      id: `ev_${nanoid(8)}`,
      clientId,
      clientName,
      type,
      title,
      description,
      metadata,
      timestamp: new Date().toISOString(),
    };
    useEventStore.getState().addEvent(newEvent);
    return newEvent;
  }
};
