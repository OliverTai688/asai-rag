"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { clientService } from "@/domains/client/service";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(2, "姓名至少需要 2 個字"),
  email: z.string().email("無效的 E-mail 格式"),
  phone: z.string().min(8, "電話格式不正確"),
  birthDate: z.string().min(1, "請選擇生日"),
  occupation: z.string().min(1, "請輸入職業"),
  annualIncome: z.number().min(0),
  status: z.enum(["PROSPECT", "ACTIVE", "CLOSED"]),
});

type FormValues = z.infer<typeof formSchema>;

export function AddClientDialog({ 
  open, 
  onOpenChange 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void 
}) {
  const router = useRouter();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      birthDate: "",
      occupation: "",
      annualIncome: 0,
      status: "PROSPECT",
    },
  });
  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: FormValues) {
    try {
      await clientService.createClientRemote(values);
      toast.success(`成功新增客戶: ${values.name}`);
      onOpenChange(false);
      form.reset();
      router.refresh();
    } catch {
      toast.error("新增失敗，請檢查資料");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-3xl border-zinc-200 dark:border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tight">新增客戶資料</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase">客戶姓名</label>
              <Input 
                placeholder="王小明" 
                {...form.register("name")} 
                className={cn("h-11 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-none px-4", form.formState.errors.name && "border-red-500")} 
              />
              {form.formState.errors.name && <p className="text-[10px] text-red-500">{form.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase">狀態</label>
              <Select 
                defaultValue={form.getValues("status")}
                onValueChange={(value) => {
                  if (value === "PROSPECT" || value === "ACTIVE" || value === "CLOSED") {
                    form.setValue("status", value);
                  }
                }}
              >
                <SelectTrigger className="h-11 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-none px-4 text-left">
                  <SelectValue placeholder="選擇狀態" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-zinc-200 dark:border-zinc-800">
                  <SelectItem value="PROSPECT">潛在客戶</SelectItem>
                  <SelectItem value="ACTIVE">正式客戶</SelectItem>
                  <SelectItem value="CLOSED">結案客戶</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-500 uppercase">電子郵件</label>
            <Input 
              placeholder="example@email.com" 
              {...form.register("email")} 
              className={cn("h-11 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-none px-4", form.formState.errors.email && "border-red-500")} 
            />
            {form.formState.errors.email && <p className="text-[10px] text-red-500">{form.formState.errors.email.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase">聯絡電話</label>
              <Input 
                placeholder="0911-222-333" 
                {...form.register("phone")} 
                className={cn("h-11 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-none px-4", form.formState.errors.phone && "border-red-500")} 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase">生日</label>
              <Input 
                type="date" 
                {...form.register("birthDate")} 
                className="h-11 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-none px-4" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase">職業</label>
              <Input 
                placeholder="科技業經理" 
                {...form.register("occupation")} 
                className="h-11 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-none px-4" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase">年收入 (TWD)</label>
              <Input 
                type="number" 
                {...form.register("annualIncome", { valueAsNumber: true })} 
                className="h-11 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-none px-4" 
              />
            </div>
          </div>

          <DialogFooter className="pt-6">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full px-6" disabled={isSubmitting}>
              取消
            </Button>
            <Button type="submit" className="rounded-full px-8 bg-[#1A3A6B] hover:bg-[#1565C0] shadow-lg shadow-[#1565C0]/20" disabled={isSubmitting}>
              {isSubmitting ? "新增中..." : "確認新增"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
