"use client";

import { useParams } from "next/navigation";
import { clientService } from "@/domains/client/service";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, Calendar, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export default function ClientPoliciesPage() {
  const params = useParams();
  const clientId = params.clientId as string;
  const client = clientService.getClientById(clientId);

  if (!client) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold mb-1">現有保障</h3>
          <p className="text-zinc-500 font-medium">記錄客戶已在他處或本處投保的有效保單。</p>
        </div>
        <Button variant="outline" className="rounded-full">手動登錄保單</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {client.existingPolicies.map((policy) => (
          <Card key={policy.id} className="rounded-3xl border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-2xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-green-50 dark:group-hover:bg-green-900/20 group-hover:text-green-600 transition-colors">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none mb-1">保額</p>
                  <p className="text-xl font-black text-zinc-900 dark:text-zinc-100">{formatCurrency(policy.amount)}</p>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-lg leading-none mb-1 group-hover:text-[#1565C0] transition-colors">{policy.type}</h4>
                <div className="flex items-center gap-4 text-xs font-bold text-zinc-400">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {policy.provider}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {client.existingPolicies.length === 0 && (
          <div className="col-span-full py-20 text-center text-zinc-400 font-medium italic border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-3xl">
            尚無既存保單資料
          </div>
        )}
      </div>
    </div>
  );
}

function Button(props: any) {
  return <button {...props} className={cn("px-4 py-2 rounded-xl text-sm font-bold border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors", props.className)} />;
}

import { cn } from "@/lib/utils";
