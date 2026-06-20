"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  status: z.enum(["PROSPECT", "ACTIVE", "CLOSED"]),
  email: z.string().email("無效的 E-mail 格式").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  birthDate: z.string().optional().or(z.literal("")),
  occupation: z.string().optional().or(z.literal("")),
  annualIncome: z.number().min(0, "不可為負數"),
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

export function AddClientDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState<string[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const form = useForm<FormInput, undefined, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      status: "PROSPECT",
      email: "",
      phone: "",
      birthDate: "",
      occupation: "",
      annualIncome: 0,
    },
  });
  const isSubmitting = form.formState.isSubmitting;

  function resetAll() {
    form.reset();
    setNotes([]);
    setNoteDraft("");
  }

  function addNote() {
    const value = noteDraft.trim();
    if (!value) return;
    setNotes((prev) => [...prev, value]);
    setNoteDraft("");
  }

  function removeNote(index: number) {
    setNotes((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(values: FormValues) {
    try {
      await clientService.createClientRemote({
        name: values.name,
        status: values.status,
        email: values.email ?? "",
        phone: values.phone ?? "",
        birthDate: values.birthDate ?? "",
        occupation: values.occupation ?? "",
        annualIncome: values.annualIncome,
        notes: notes.join("\n"),
      });
      toast.success(`成功新增客戶: ${values.name}`);
      onOpenChange(false);
      resetAll();
      router.refresh();
    } catch {
      toast.error("新增失敗，請檢查資料");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetAll();
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[560px] rounded-3xl border-zinc-200 dark:border-zinc-800">
        <DialogHeader className="space-y-1 border-b border-zinc-100 px-6 py-5 dark:border-zinc-800">
          <DialogTitle className="text-2xl font-bold tracking-tight">新增客戶資料</DialogTitle>
          <DialogDescription className="text-sm text-zinc-500">
            僅「客戶姓名」為必填，其餘可日後補齊。標示 <span className="text-zinc-400">選填</span> 的欄位可留空。
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
                    defaultValue={form.getValues("status")}
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
              <div className="flex items-baseline justify-between">
                <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">情境筆記</p>
                <span className="text-[10px] text-zinc-400">記錄初次接觸、背景或需求情境</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addNote();
                    }
                  }}
                  placeholder="例如：朋友介紹，近期有換屋計畫"
                  className={fieldClass}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addNote}
                  disabled={!noteDraft.trim()}
                  className="h-11 shrink-0 gap-1 rounded-xl px-4"
                >
                  <Plus className="size-4" />
                  新增
                </Button>
              </div>
              {notes.length > 0 ? (
                <ul className="space-y-2">
                  {notes.map((note, index) => (
                    <li
                      key={`${note}-${index}`}
                      className="flex items-start justify-between gap-3 rounded-xl bg-zinc-50 px-4 py-2.5 text-sm dark:bg-zinc-800/60"
                    >
                      <span className="whitespace-pre-wrap break-words text-zinc-700 dark:text-zinc-200">{note}</span>
                      <button
                        type="button"
                        onClick={() => removeNote(index)}
                        aria-label="移除此筆記"
                        className="mt-0.5 shrink-0 rounded-md p-0.5 text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-700"
                      >
                        <X className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-3 text-xs text-zinc-400 dark:border-zinc-700">
                  尚未新增筆記。輸入文字後按 Enter 或「新增」即可逐條記錄。
                </p>
              )}
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
              {isSubmitting ? "新增中..." : "確認新增"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
