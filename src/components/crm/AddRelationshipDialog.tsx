"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { clientService } from "@/domains/client/service";
import { FamilyMember, RELATION_GROUPS } from "@/domains/client/types";
import { toast } from "sonner";

interface AddRelationshipDialogProps {
  clientId: string;
  clientName: string;
  existingMembers?: FamilyMember[];
  // Controlled mode: parent manages open state
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Pre-fill which node to connect to (null = root, string = member id)
  defaultParentMemberId?: string | null;
  mode?: "child" | "parent";
  onSuccess?: () => void;
}

export function AddRelationshipDialog({
  clientId,
  clientName,
  existingMembers = [],
  open,
  onOpenChange,
  defaultParentMemberId,
  mode = "child",
  onSuccess,
}: AddRelationshipDialogProps) {
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [parentMemberId, setParentMemberId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedParentMemberId = parentMemberId ?? (defaultParentMemberId == null ? "__root__" : defaultParentMemberId);

  function handleClose() {
    onOpenChange(false);
    setName("");
    setRelation("");
    setAge("");
    setPhone("");
    setParentMemberId(null);
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();

    if (!name || !relation) {
      toast.error("請填寫姓名與關係");
      return;
    }

    try {
      setIsSubmitting(true);
      if (mode === "child") {
        await clientService.createFamilyMemberRemote(clientId, {
          name,
          relation,
          age: age ? parseInt(age) : undefined,
          phone: phone || undefined,
          parentMemberId: selectedParentMemberId === "__root__" ? undefined : selectedParentMemberId,
        });
      } else {
        // Parent mode remains a local graph helper until the relationship re-parent API is added.
        const newMember = clientService.addFamilyMember(clientId, {
          name,
          relation,
          age: age ? parseInt(age) : undefined,
          phone: phone || undefined,
          // New parent might also have a parent, but for now we assume it's a new root branch
        });

        if (newMember) {
          // Then update the target node's parentMemberId
          if (selectedParentMemberId === "__root__") {
            clientService.updateClient(clientId, { parentMemberId: newMember.id });
          } else {
            clientService.updateFamilyMember(clientId, selectedParentMemberId, { parentMemberId: newMember.id });
          }
        }
      }

      toast.success("關係人已新增");
      handleClose();
      onSuccess?.();
    } catch (err) {
      console.error(err);
      toast.error("新增失敗，請稍後再試");
    } finally {
      setIsSubmitting(false);
    }
  }

  const parentOptions = [
    { id: "__root__", label: clientName, sublabel: "主客戶" },
    ...existingMembers.map((m) => ({
      id: m.id,
      label: m.name,
      sublabel: m.relation,
    })),
  ];

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleClose(); }}>
      <DialogContent className="sm:max-w-[440px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {mode === "child" ? "新增客戶關係人" : "新增父輩關係人"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-bold">姓名</Label>
            <Input
              id="name"
              placeholder="例如：林小美"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-bold">關係</Label>
              <Select
                value={relation}
                onValueChange={(value) => setRelation(value ?? "")}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="請選擇" />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-72">
                  {Object.entries(RELATION_GROUPS).map(([group, options]) => (
                    <SelectGroup key={group}>
                      <SelectLabel className="text-xs text-zinc-400 font-bold">{group}</SelectLabel>
                      {options.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="age" className="text-sm font-bold">年齡 (選填)</Label>
              <Input
                id="age"
                type="number"
                placeholder="30"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-bold">聯絡電話 (選填)</Label>
            <Input
              id="phone"
              placeholder="0912-345-678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-bold">
              {mode === "child" ? "連結至" : "作為此人的父母"}
            </Label>
            <Select
              value={selectedParentMemberId}
              onValueChange={(value) => setParentMemberId(value ?? "__root__")}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="請選擇連結對象" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {parentOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    <span className="font-bold">{opt.label}</span>
                    <span className="ml-1.5 text-xs text-zinc-400">({opt.sublabel})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-zinc-400">選擇此關係人在關係圖中連結到哪個節點</p>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={handleClose} className="rounded-xl" disabled={isSubmitting}>
              取消
            </Button>
            <Button type="submit" className="bg-[#1A3A6B] hover:bg-[#1565C0] rounded-xl px-8" disabled={isSubmitting}>
              {isSubmitting ? "儲存中..." : "儲存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
