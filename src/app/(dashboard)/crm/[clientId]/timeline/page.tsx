"use client";

import { useParams } from "next/navigation";
import { eventService } from "@/domains/event/service";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";

export default function ClientTimelinePage() {
  const params = useParams();
  const clientId = params.clientId as string;
  const events = eventService.getEventsByClientId(clientId);

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="mb-6">
        <h3 className="text-2xl font-bold mb-2">互動時間軸</h3>
        <p className="text-zinc-500 font-medium">記錄與該客戶的所有互動軌跡，包括 SPIN 對話、演練與報告生成。</p>
      </div>

      <ActivityTimeline events={events} />
    </div>
  );
}
