import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { User, Send, MessageCircle } from "lucide-react";
import { nanoid } from "nanoid";
import { FormattedTime } from "@/components/ui/formatted-time";

interface FeedbackItem {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

interface FeedbackPanelProps {
  feedback: FeedbackItem[];
  onAddFeedback: (content: string) => void;
}

export const FeedbackPanel: React.FC<FeedbackPanelProps> = ({ feedback, onAddFeedback }) => {
  const [newComment, setNewComment] = useState("");

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    onAddFeedback(newComment);
    setNewComment("");
  };

  return (
    <Card className="rounded-3xl border-zinc-200 shadow-sm overflow-hidden bg-zinc-50/30">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-[#1565C0]" /> 團隊回饋與建議
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Comment List */}
        <div className="space-y-4">
          {feedback.length === 0 ? (
            <p className="text-xs text-zinc-400 italic text-center py-4">目前尚無團隊建議，邀請夥伴一起優化這份規劃吧！</p>
          ) : (
            feedback.map((item) => (
              <div key={item.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-white border border-zinc-200 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-zinc-400" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-zinc-700">{item.authorName}</span>
                    <span className="text-[9px] text-zinc-400"><FormattedTime isoString={item.createdAt} format="full" /></span>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-zinc-100 shadow-sm">
                    <p className="text-xs text-zinc-600 leading-relaxed">{item.content}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input Area */}
        <div className="pt-4 border-t border-zinc-100 flex gap-3">
          <Textarea 
            placeholder="輸入您的建議..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="rounded-2xl border-zinc-200 bg-white min-h-[80px] text-xs"
          />
          <Button 
            size="icon" 
            className="rounded-2xl bg-[#1A3A6B] hover:bg-[#1565C0] h-12 w-12 shrink-0 self-end shadow-lg shadow-[#90CAF9]/20"
            onClick={handleSubmit}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
