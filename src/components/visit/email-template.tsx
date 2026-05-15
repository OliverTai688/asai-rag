import React from "react";

interface EmailTemplateProps {
  agentName: string;
  clientName: string;
  visitTime: string;
  objectives: string[];
  topQuestions: string[];
  objectionResponse: {
    question: string;
    answer: string;
  };
}

export const VisitReminderEmail: React.FC<EmailTemplateProps> = ({
  agentName,
  clientName,
  visitTime,
  objectives,
  topQuestions,
  objectionResponse,
}) => {
  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: "600px", margin: "0 auto", backgroundColor: "#f9f9f9", padding: "20px" }}>
      <div style={{ backgroundColor: "#1A3A6B", padding: "40px 20px", borderRadius: "16px 16px 0 0", textAlign: "center" }}>
        <h1 style={{ color: "#ffffff", margin: "0", fontSize: "24px" }}>拜訪前衝刺速覽</h1>
        <p style={{ color: "#D6E8F8", margin: "10px 0 0", fontSize: "14px" }}>為您明天的拜訪做好 100% 準備</p>
      </div>

      <div style={{ backgroundColor: "#ffffff", padding: "30px", borderRadius: "0 0 16px 16px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
        <p style={{ fontSize: "16px", color: "#333" }}>親愛的 {agentName}，</p>
        <p style={{ fontSize: "14px", color: "#666", lineHeight: "1.6" }}>
          明天您將拜訪 <strong>{clientName}</strong>。我們為您整理了「15 分鐘速覽卡」，幫助您在路途中快速進入作戰狀態：
        </p>

        {/* Tactical Card: Objectives */}
        <div style={{ marginTop: "30px", padding: "20px", backgroundColor: "#fff7ed", borderRadius: "12px", border: "1px solid #ffedd5" }}>
          <h3 style={{ margin: "0 0 15px", color: "#ea580c", fontSize: "14px", textTransform: "uppercase", letterSpacing: "1px" }}>🎯 核心目標</h3>
          <ul style={{ margin: "0", paddingLeft: "20px", color: "#9a3412", fontSize: "13px" }}>
            {objectives.map((obj, i) => <li key={i} style={{ marginBottom: "8px" }}>{obj}</li>)}
          </ul>
        </div>

        {/* Tactical Card: SPIN */}
        <div style={{ marginTop: "20px", padding: "20px", backgroundColor: "#eff6ff", borderRadius: "12px", border: "1px solid #dbeafe" }}>
          <h3 style={{ margin: "0 0 15px", color: "#2563eb", fontSize: "14px", textTransform: "uppercase", letterSpacing: "1px" }}>💬 必問金句 (SPIN)</h3>
          {topQuestions.map((q, i) => (
            <p key={i} style={{ fontSize: "13px", color: "#1e40af", fontStyle: "italic", margin: "0 0 10px" }}>「{q}」</p>
          ))}
        </div>

        {/* Tactical Card: Objection */}
        <div style={{ marginTop: "20px", padding: "20px", backgroundColor: "#1A3A6B", borderRadius: "12px", color: "#ffffff" }}>
          <h3 style={{ margin: "0 0 10px", color: "#93c5fd", fontSize: "12px", textTransform: "uppercase" }}>🛡️ 攻防建議</h3>
          <p style={{ fontSize: "12px", color: "#bfdbfe", margin: "0 0 8px" }}>若客戶問：{objectionResponse.question}</p>
          <p style={{ fontSize: "14px", fontWeight: "bold", margin: "0" }}>{objectionResponse.answer}</p>
        </div>

        <div style={{ marginTop: "40px", textAlign: "center" }}>
          <a 
            href="#" 
            style={{ 
              display: "inline-block", 
              backgroundColor: "#1A3A6B", 
              color: "#ffffff", 
              padding: "15px 30px", 
              borderRadius: "12px", 
              textDecoration: "none", 
              fontWeight: "bold",
              fontSize: "16px"
            }}
          >
            查看完整規劃詳情
          </a>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: "20px", fontSize: "12px", color: "#999" }}>
        © 2026 AS-AI RAG Preparing System. All rights reserved.
      </div>
    </div>
  );
};
