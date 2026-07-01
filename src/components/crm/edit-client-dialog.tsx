"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { clientService } from "@/domains/client/service";
import { type Client } from "@/domains/client/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(2, "姓名至少需要 2 個字"),
  status: z.enum(["PROSPECT", "ACTIVE", "CLOSED"]),
  email: z.string().email("無效的 E-mail 格式").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  birthDate: z.string().optional().or(z.literal("")),
  occupation: z.string().optional().or(z.literal("")),
  annualIncome: z.number().min(0, "不可為負數"),
  notes: z.string().optional().or(z.literal("")),
});

type FormInput = z.input<typeof formSchema>;
type FormValues = z.output<typeof formSchema>;

const fieldClass =
  "h-11 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-transparent px-4 transition-colors focus-visible:border-[#1A3A6B]/40";

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
      {children}
      {required ? (
        <span className="text-red-500" aria-hidden>
          *
        </span>
      ) : (
        <span className="text-[10px] font-medium normal-case tracking-normal text-zinc-400">選填</span>
      )}
    </label>
  );
}

function toDefaults(client: Client): FormInput {
  return {
    name: client.name,
    status: client.status,
    email: client.email ?? "",
    phone: client.phone ?? "",
    birthDate: client.birthDate ?? "",
    occupation: client.occupation ?? "",
    annualIncome: client.annualIncome ?? 0,
    notes: client.notes ?? "",
  };
}

export function EditClientDialog({
  client,
  open,
  onOpenChange,
}: {
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const form = useForm<FormInput, undefined, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: toDefaults(client),
  });
  const isSubmitting = form.formState.isSubmitting;

  // Re-sync the form whenever the dialog opens or the underlying client changes.
  useEffect(() => {
    if (open) {
      form.reset(toDefaults(client));
    }
  }, [open, client, form]);

  async function onSubmit(values: FormValues) {
    try {
      await clientService.updateClientRemote(client.id, {
        name: values.name,
        status: values.status,
        email: values.email ?? "",
        phone: values.phone ?? "",
        birthDate: values.birthDate ?? "",
        occupation: values.occupation ?? "",
        annualIncome: values.annualIncome,
        notes: values.notes ?? "",
      });
      toast.success(`已更新客戶資料：${values.name}`);
      onOpenChange(false);
    } catch {
      toast.error("更新失敗，請檢查資料或稍後再試");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[560px] rounded-3xl border-zinc-200 dark:border-zinc-800">
        <DialogHeader className="space-y-1 border-b border-zinc-100 px-6 py-5 dark:border-zinc-800">
          <DialogTitle className="text-2xl font-bold tracking-tight">編輯客戶基礎資料</DialogTitle>
          <DialogDescription className="text-sm text-zinc-500">
            更新姓名、聯絡方式與客戶背景。合規欄位（KYC、敏感等級）不在此表單調整。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
            {/* 基本資料 */}
            <section className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">基本資料</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <FieldLabel required>客戶姓名</FieldLabel>
                  <Input
                    placeholder="王小明"
                    {...form.register("name")}
                    className={cn(fieldClass, form.formState.errors.name && "border-red-500")}
                  />
                  {form.formState.errors.name && (
                    <p className="text-[10px] text-red-500">{form.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <FieldLabel required>狀態</FieldLabel>
                  <Select
                    value={form.watch("status")}
                    onValueChange={(value) => {
                      if (value === "PROSPECT" || value === "ACTIVE" || value === "CLOSED") {
                        form.setValue("status", value);
                      }
                    }}
                  >
                    <SelectTrigger className={cn(fieldClass, "text-left")}>
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
            </section>

            {/* 聯絡方式 */}
            <section className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">聯絡方式</p>
              <div className="space-y-1.5">
                <FieldLabel>電子郵件</FieldLabel>
                <Input
                  placeholder="example@email.com"
                  {...form.register("email")}
                  className={cn(fieldClass, form.formState.errors.email && "border-red-500")}
                />
                {form.formState.errors.email && (
                  <p className="text-[10px] text-red-500">{form.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <FieldLabel>聯絡電話</FieldLabel>
                <Input placeholder="0911-222-333" {...form.register("phone")} className={fieldClass} />
              </div>
            </section>

            {/* 客戶背景 */}
            <section className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">客戶背景</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <FieldLabel>生日</FieldLabel>
                  <Input type="date" {...form.register("birthDate")} className={fieldClass} />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>職業</FieldLabel>
                  <Input placeholder="科技業經理" {...form.register("occupation")} className={fieldClass} />
                </div>
              </div>
              <div className="space-y-1.5">
                <FieldLabel>年收入 (TWD)</FieldLabel>
                <Input
                  type="number"
                  placeholder="0"
                  {...form.register("annualIncome", {
                    setValueAs: (value) => (value === "" || value === null ? 0 : Number(value)),
                  })}
                  className={cn(fieldClass, form.formState.errors.annualIncome && "border-red-500")}
                />
                {form.formState.errors.annualIncome && (
                  <p className="text-[10px] text-red-500">{form.formState.errors.annualIncome.message}</p>
                )}
              </div>
            </section>

            {/* 情境筆記 */}
            <section className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">情境筆記</p>
              <Textarea
                {...form.register("notes")}
                placeholder="記錄初次接觸、背景或需求情境"
                className="min-h-24 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-transparent px-4 py-3 transition-colors focus-visible:border-[#1A3A6B]/40"
              />
            </section>
          </div>

          <DialogFooter className="gap-2 border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="rounded-full px-6"
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button
              type="submit"
              className="rounded-full px-8 bg-[#1A3A6B] hover:bg-[#1565C0] shadow-lg shadow-[#1565C0]/20"
              disabled={isSubmitting}
            >
              {isSubmitting ? "儲存中..." : "儲存變更"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
