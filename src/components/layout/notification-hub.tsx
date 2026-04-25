"use client";

import { useAssistantStore } from "@/domains/assistant/store";
import { 
  Bell, 
  CheckCheck, 
  Circle, 
  ExternalLink, 
  FileText, 
  UserPlus, 
  History
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FormattedTime } from "@/components/ui/formatted-time";

export function NotificationHub() {
  const { notifications, markAsRead } = useAssistantStore();
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'REPORT_OPENED': return <FileText className="w-4 h-4 text-green-500" />;
      case 'CHANCE': return <UserPlus className="w-4 h-4 text-indigo-500" />;
      case 'OVERDUE': return <Circle className="w-4 h-4 text-red-500" />;
      default: return <Bell className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <div className="relative p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group">
          <Bell className="w-5 h-5 text-zinc-500 group-hover:text-indigo-600" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-black text-white flex items-center justify-center ring-2 ring-white">
              {unreadCount}
            </span>
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[300px] rounded-2xl p-2 border-zinc-200 dark:border-zinc-800 shadow-2xl">
        <DropdownMenuLabel className="flex items-center justify-between px-3 py-2">
           <span className="font-black text-xs uppercase tracking-widest text-zinc-400">通知中心</span>
           {unreadCount > 0 && (
             <Button variant="ghost" size="sm" className="h-6 text-[10px] font-bold text-indigo-600">
               全部標為已讀
             </Button>
           )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
           {notifications.length === 0 ? (
             <div className="py-10 text-center space-y-2 opacity-50">
                <History className="w-8 h-8 text-zinc-300 mx-auto" />
                <p className="text-xs font-bold text-zinc-400">尚無任何通知</p>
             </div>
           ) : (
             notifications.map((n) => (
               <DropdownMenuItem 
                key={n.id} 
                onClick={() => markAsRead(n.id)}
                className={cn(
                  "p-3 rounded-xl flex items-start gap-3 focus:bg-zinc-50 dark:focus:bg-zinc-800 mb-1 cursor-pointer",
                  !n.isRead && "bg-indigo-50/30 dark:bg-indigo-900/10"
                )}
               >
                 <div className="mt-1">{getIcon(n.type)}</div>
                 <div className="flex-1 space-y-1">
                    <p className="text-xs font-bold leading-none">{n.title}</p>
                    <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">{n.content}</p>
                    <p className="text-[9px] text-zinc-400 font-bold uppercase"><FormattedTime isoString={n.createdAt} /></p>
                 </div>
               </DropdownMenuItem>
             ))
           )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="justify-center p-2 rounded-xl text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-indigo-600">
           查看所有歷史記錄
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
