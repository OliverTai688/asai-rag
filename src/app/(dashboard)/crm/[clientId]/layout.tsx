"use client";

import { useMemo, useState, useEffect } from "react";
import { clientService } from "@/domains/client/service";
import { STRINGS } from "@/lib/i18n/strings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ChevronLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Users, 
  Coins, 
  Briefcase,
  ExternalLink,
  Edit2,
  Trash2,
  Plus,
  UserPlus
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { RelationshipType, FamilyMember, Client } from "@/domains/client/types";
import { nanoid } from "nanoid";
import { useClientStore } from "@/domains/client/store";
import { useMounted } from "@/lib/hooks/use-mounted";

export default function Client360Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const clientId = params.clientId as string;
  const client = clientService.getClientById(clientId);
  const updateClient = useClientStore((state) => state.updateClient);
  const mounted = useMounted();

  const [isEditing, setIsEditing] = useState(false);

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-xl font-bold mb-4">找不到該客戶</p>
        <Button onClick={() => router.push("/crm")}>返回列表</Button>
      </div>
    );
  }

  const tabs = [
    { name: "總覽", href: `/crm/${clientId}` },
    { name: "關係圖", href: `/crm/${clientId}/relationships` },
    { name: "活動時間軸", href: `/crm/${clientId}/timeline` },
    { name: "報告歷史", href: `/crm/${clientId}/reports` },
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* Breadcrumb / Back */}
      <div className="flex items-center gap-2 text-sm font-bold text-zinc-400">
        <Link href="/crm" className="hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center transition-colors">
          <ChevronLeft className="w-4 h-4" /> 客戶列表
        </Link>
        <span>/</span>
        <span className="text-zinc-900 dark:text-zinc-100">{client.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* LEFT PANEL: Client Identity */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="rounded-3xl border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden sticky top-20">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-20 h-20 rounded-3xl bg-[#EBF3FB] dark:bg-[#1A3A6B]/20 flex items-center justify-center mb-4">
                  <Users className="w-10 h-10 text-[#1565C0] dark:text-[#2196F3]" />
                </div>
                <h2 className="text-2xl font-bold mb-1">{client.name}</h2>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-50 text-green-600 border-none font-bold">
                    {STRINGS.crm.categories[client.status]}
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 rounded-full text-zinc-400 hover:text-[#1565C0]"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-zinc-400 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">電子郵件</p>
                    <p className="text-sm font-medium truncate">{mounted ? client.email : "---"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-zinc-400 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">聯絡電話</p>
                    <p className="text-sm font-medium">{mounted ? client.phone : "---"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Briefcase className="w-4 h-4 text-zinc-400 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">職業</p>
                    <p className="text-sm font-medium">{mounted ? client.occupation : "---"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Coins className="w-4 h-4 text-zinc-400 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">年收入 (約略)</p>
                    <p className="text-sm font-medium">{mounted ? formatCurrency(client.annualIncome) : "---"}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
                <div>
                  <p className="text-xs font-bold text-zinc-400 mb-3 uppercase tracking-wider italic">AI 標籤分析</p>
                  <div className="flex flex-wrap gap-2">
                    {mounted && client.aiTags.map(tag => (
                      <Badge key={tag} className="bg-[#EBF3FB] dark:bg-[#1A3A6B]/20 text-[#1565C0] dark:text-[#2196F3] border-none font-bold">
                        {tag}
                      </Badge>
                    ))}
                    {mounted && client.aiTags.length === 0 && <span className="text-xs text-zinc-400 italic">尚未生成分析標籤</span>}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-zinc-400 mb-3 uppercase tracking-wider">家庭成員</p>
                  <div className="space-y-2">
                    {mounted && client.family.map((member, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800">
                        <span className="text-xs font-bold">{member.name}</span>
                        <Badge variant="ghost" className="text-[10px] py-0 h-4 uppercase">{member.relation}</Badge>
                      </div>
                    ))}
                    {mounted && client.family.length === 0 && <p className="text-xs text-zinc-400 italic">尚無資料</p>}
                    {!mounted && <div className="h-20 w-full animate-pulse bg-zinc-100 dark:bg-zinc-800 rounded-xl" />}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-2">
                <Button 
                  className="w-full rounded-xl bg-[#1A3A6B] hover:bg-[#1565C0]"
                  onClick={() => router.push(`/spin?clientId=${clientId}&autoCreate=true`)}
                >
                  開始 SPIN 對話
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full rounded-xl"
                  onClick={() => router.push(`/pre-visit?clientId=${clientId}&autoCreate=true`)}
                >
                  訪前規劃
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT PANEL: Tabs Content */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href;
              return (
                <Link 
                  key={tab.href} 
                  href={tab.href}
                  className={cn(
                    "px-5 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                    isActive 
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100" 
                      : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  )}
                >
                  {tab.name}
                </Link>
              );
            })}
          </div>

          <div className="min-h-[500px]">
            {children}
          </div>
        </div>
      </div>

      {/* Edit Client Dialog */}
      <EditClientDialog 
        open={isEditing}
        onOpenChange={setIsEditing}
        client={client}
        onSave={(updates) => updateClient(clientId, updates)}
      />
    </div>
  );
}

function EditClientDialog({ 
  open, 
  onOpenChange, 
  client, 
  onSave 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  client: Client;
  onSave: (updates: Partial<Client>) => void;
}) {
  const [formData, setFormData] = useState<Partial<Client>>({
    name: client.name,
    email: client.email,
    phone: client.phone,
    occupation: client.occupation,
    annualIncome: client.annualIncome,
    family: [...client.family]
  });

  useEffect(() => {
    if (open) {
      setFormData({
        name: client.name,
        email: client.email,
        phone: client.phone,
        occupation: client.occupation,
        annualIncome: client.annualIncome,
        family: [...client.family]
      });
    }
  }, [client, open]);

  const handleUpdateField = (field: keyof Client, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddFamilyMember = () => {
    const newMember: FamilyMember = {
      id: `f_${nanoid(6)}`,
      name: "",
      relation: "其他",
      age: undefined
    };
    setFormData(prev => ({
      ...prev,
      family: [...(prev.family || []), newMember]
    }));
  };

  const handleUpdateFamilyMember = (id: string, field: keyof FamilyMember, value: any) => {
    setFormData(prev => ({
      ...prev,
      family: prev.family?.map(m => m.id === id ? { ...m, [field]: value } : m)
    }));
  };

  const handleRemoveFamilyMember = (id: string) => {
    setFormData(prev => ({
      ...prev,
      family: prev.family?.filter(m => m.id !== id)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>編輯客戶資料</DialogTitle>
          <DialogDescription>更新客戶的基本資訊與家庭成員狀態。</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>姓名</Label>
              <Input 
                value={formData.name} 
                onChange={(e) => handleUpdateField("name", e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>聯絡電話</Label>
              <Input 
                value={formData.phone} 
                onChange={(e) => handleUpdateField("phone", e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>電子郵件</Label>
              <Input 
                value={formData.email} 
                onChange={(e) => handleUpdateField("email", e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label>職業</Label>
              <Input 
                value={formData.occupation} 
                onChange={(e) => handleUpdateField("occupation", e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>年收入 (約略)</Label>
              <Input 
                type="number"
                value={formData.annualIncome} 
                onChange={(e) => handleUpdateField("annualIncome", Number(e.target.value))}
                className="rounded-xl"
              />
            </div>
          </div>

          {/* Family Members */}
          <div className="pt-4 border-t border-zinc-100">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-base font-bold">家庭成員</Label>
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-xl gap-2 border-dashed"
                onClick={handleAddFamilyMember}
              >
                <UserPlus className="w-4 h-4" /> 新增成員
              </Button>
            </div>
            
            <div className="space-y-3">
              {formData.family?.map((member) => (
                <div key={member.id} className="flex items-end gap-3 p-4 rounded-2xl bg-zinc-50 relative group">
                  <div className="flex-1 space-y-2">
                    <Label className="text-[10px] font-bold text-zinc-400 uppercase">姓名</Label>
                    <Input 
                      value={member.name}
                      onChange={(e) => handleUpdateFamilyMember(member.id, "name", e.target.value)}
                      className="rounded-xl bg-white h-9"
                    />
                  </div>
                  <div className="w-32 space-y-2">
                    <Label className="text-[10px] font-bold text-zinc-400 uppercase">關係</Label>
                    <Select 
                      value={member.relation as string} 
                      onValueChange={(val) => handleUpdateFamilyMember(member.id, "relation", val)}
                    >
                      <SelectTrigger className="rounded-xl bg-white h-9">
                        <SelectValue placeholder="選擇關係" />
                      </SelectTrigger>
                      <SelectContent>
                        {["配偶", "子", "女", "父", "母", "兄", "弟", "姐", "妹", "親戚", "朋友", "合作夥伴", "其他"].map(rel => (
                          <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-20 space-y-2">
                    <Label className="text-[10px] font-bold text-zinc-400 uppercase">年齡</Label>
                    <Input 
                      type="number"
                      value={member.age || ""}
                      onChange={(e) => handleUpdateFamilyMember(member.id, "age", Number(e.target.value))}
                      className="rounded-xl bg-white h-9"
                    />
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 rounded-xl text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    onClick={() => handleRemoveFamilyMember(member.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {formData.family?.length === 0 && (
                <div className="py-8 text-center border-2 border-dashed border-zinc-100 rounded-2xl">
                  <p className="text-sm text-zinc-400 font-medium">目前尚無家庭成員資料</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-zinc-100">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl h-11 px-6 font-bold">取消</Button>
          <Button 
            onClick={() => { onSave(formData); onOpenChange(false); }} 
            className="rounded-xl bg-[#1A3A6B] hover:bg-[#1565C0] h-11 px-8 font-bold"
          >
            儲存變更
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
