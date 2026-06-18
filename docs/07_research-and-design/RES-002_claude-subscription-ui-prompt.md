# Claude UI/UX 開發指南：訂閱機制與多步驟購買流程

本文件旨在提供給 Claude（AI 助手）參考，以最高效率與最佳架構來開發「訂閱方案展示」、「多步驟購買彈跳窗」以及「管理員儀表板」的 UI 介面。

**⚠️ 重要原則：Container-Presenter 模式**
為了確保前端 UI 能夠與後端邏輯完美接合，我們已經將**狀態管理（State）與商業邏輯完全抽離到自訂 Hooks 中**。
Claude 在實作元件時，**請專注於「視覺設計」、「排版佈局」、「動畫體驗 (Framer Motion / Tailwind 動畫)」與「RWD 響應式設計」**，**切勿**在元件內加入任何 `useEffect`、API 呼叫或 Context Provider。

---

## 1. 開發任務目標

需要優化與實作以下三個核心畫面的 UI：

### A. 訂閱定價區塊 (Pricing Section)
- **檔案位置**：`src/components/subscription/PricingSection.tsx`
- **設計需求**：
  - 現代化的 SaaS 產品定價卡片設計（例如：Glassmorphism、深色模式支援、hover 微動畫）。
  - 需要展示四個方案：Free ($0), Starter ($29), Pro ($79), Enterprise (Custom)。
  - 強調（Highlight） Starter 或 Pro 方案。
- **介接方式**：
  - 元件只需接收 `onSelectPlan: (plan: PlanType) => void` 屬性。
  - 當使用者點擊「選擇方案」時，直接呼叫 `onSelectPlan('STARTER')` 即可。

### B. 多步驟購買彈跳窗 (Purchase Modal)
- **檔案位置**：`src/components/subscription/PurchaseModal.tsx`
- **設計需求**：
  - 作為多步驟表單的容器。可以使用 shadcn 的 `Dialog` 或客製化的 Modal 樣式。
  - 畫面頂部需要有步驟指示器 (Stepper: 1. 確認方案 -> 2. 付款資訊 -> 3. 完成)。
  - 需拆分三個子元件來對應不同步驟（請自行規劃元件結構，例如建立 `StepPlanSelection`, `StepPaymentDetails`, `StepSuccess`）。
- **介接方式**：
  - 從 `useSubscriptionForm` 讀取狀態與操作方法：
    ```tsx
    const { isOpen, closeModal, currentStep, selectedPlan, nextStep, prevStep } = useSubscriptionForm();
    ```

### C. Admin 管理員儀表板 (Admin Dashboard)
- **檔案位置**：`src/app/(admin)/admin/page.tsx`
- **設計需求**：
  - 專業的後台管理介面，包含左側/上方導覽列、歡迎標語。
  - **資料概覽卡片**：(總營收、活躍試用人數等佔位符 UI)。
  - **系統設定區塊**：一個可以輸入數字的表單，用來設定「預設試用天數 (Trial Days)」。
  - **訂單資料表**：使用表格或清單來展示近期的 `SubscriptionOrder` 紀錄。

---

## 2. 既有的狀態 Hooks (請直接取用)

我們已經準備好了狀態管理器，請直接在 UI 元件中引入使用。

### `useSubscriptionForm.ts`
用於管理多步驟購買彈跳窗的全局狀態。

```typescript
// 引入方式
import { useSubscriptionForm, PlanType } from '@/domains/subscription/hooks/useSubscriptionForm';

// 可用的狀態與方法
interface SubscriptionFormState {
  isOpen: boolean;         // 彈跳窗是否開啟
  currentStep: number;     // 目前步驟 (1, 2, 3...)
  selectedPlan: PlanType | null; // 目前選擇的方案
  
  openModal: (plan?: PlanType) => void; // 開啟彈跳窗並可帶入選擇的方案
  closeModal: () => void;               // 關閉彈跳窗
  nextStep: () => void;                 // 下一步
  prevStep: () => void;                 // 上一步
}
```

---

## 3. 給 Claude 的建議 Prompt

當你要開始建構 UI 時，建議對 Claude 送出以下提示詞：

> 「你現在是一個頂尖的 Frontend UI/UX 工程師。請參考 `docs/claude_subscription_ui_prompt.md` 的架構指示，幫我使用 Tailwind CSS 和 shadcn/ui 重寫 `PricingSection.tsx` 與 `PurchaseModal.tsx`。
> 
> 需求：
> 1. 請提供極具現代感的設計（支援深色模式、流暢過渡動畫）。
> 2. 請遵守 Container-Presenter 模式，直接調用我寫好的 `useSubscriptionForm` 進行步驟切換與關閉。
> 3. 不要寫任何跟 API 串接或 useEffect 相關的邏輯。」

---

**請開始針對上述指定路徑的檔案，產出高品質的 UI 程式碼。**
