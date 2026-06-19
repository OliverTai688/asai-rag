# Agent Loop Report — PIM-004 Voice UX Shell

Date: 2026-06-19

## 本輪戰役名稱

Realtime Voice × Park-style Interview Memory — PIM-004 `/interview` 中文語音 UX shell

## 選擇原因

PIM-003 已完成劇場場域建構的 Park memory packet；下一個最低未完成且最接近「中文即時語音訪談」上線阻擋的項目，是先完成 `/interview` 的 voice UX shell、consent、fallback、transcript correction placeholder 與 memory rail。此輪不接 production Realtime，不保存 raw audio。

## 方法論研究摘要

- MDN Web Speech API 說明 speech recognition 會從麥克風取音並回傳文字；預設可能走 server recognition，若要更高隱私需考慮 on-device recognition。PIM-004 因此只做 shell，不把 raw audio 或 provider transport 實作進產品。來源：https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API
- Web Speech API spec 的安全/隱私段落要求 speech input 只在 explicit informed user consent 後開始，且需有明顯錄音指示。PIM-004 因此把「啟用麥克風」做成使用者主動動作，並在畫面上保留 voice stage。來源：https://webaudio.github.io/web-speech-api/
- Nielsen Norman Group permission request 指出 permission copy、timing、decision reversal 是關鍵；context-related permission 較不突兀。PIM-004 因此在按鈕旁先顯示 no raw audio、fallback 與保存規則，再由使用者點擊啟用。來源：https://www.nngroup.com/articles/permission-requests/

## 對應 batch / task

- `AGENTS.md` → Batch PIM-004
- `docs/05_execution-plans/PLN-018_realtime-voice-park-memory-interview-batch-tasks-v1.0.md` → Batch PIM-004
- 驗收：`docs/08_acceptance-and-qa/ACC-010_realtime-voice-park-memory-interview-acceptance-framework-v1.0.md`

## 實際完成內容

- `/interview` 新增 mode toggle：文字訪談 / 中文語音 Beta。
- 新增 mic consent 區塊：明確標示「預設不保存 raw audio，只保存 transcript / structured memory placeholder」。
- 新增 live voice stage：未連線、聽取中、AI 思考中、AI 回覆中、已暫停、權限被拒、瀏覽器不支援。
- 新增 live transcript panel 與 transcript correction UI。
- Correction 會寫入 local interview store 的 `UNKNOWN` material placeholder，不寫回 CRM、不保存 raw audio。
- 新增 memory rail：已確認/事實、推論、待確認。
- 文字 fallback 保持可用；permission denied / unsupported 不阻斷文字陪談。
- 修補中文 IME composition guard：組字期間 Enter 不會誤觸送出。

## 修改檔案

- `src/app/(dashboard)/interview/page.tsx`
- `AGENTS.md`
- `docs/05_execution-plans/PLN-018_realtime-voice-park-memory-interview-batch-tasks-v1.0.md`
- `docs/2_agent-input/generated/agent-loop/issue-question.md`
- `docs/2_agent-input/generated/agent-loop/reports/2026-06-19_pim-004-voice-ux-shell.md`
- `docs/06_audits-and-reports/screenshots/pim/pim-004-interview-desktop.png`
- `docs/06_audits-and-reports/screenshots/pim/pim-004-interview-mobile.png`

## DB / Prisma 操作

- DB target 判斷：本輪不讀寫 DB，只改 client UI shell 與 local Zustand material placeholder。
- Schema 變更摘要：無。
- Prisma generate 結果：`pnpm build` 依既有 script 執行 `prisma generate`，成功。
- db push 結果：未執行。
- Seed/backfill 結果：未執行。
- Production migration approval：不需要。

## 驗收指令與結果

- `pnpm exec tsc --noEmit --pretty false`：通過。
- `pnpm exec eslint src/app/(dashboard)/interview/page.tsx`：通過。
- `pnpm run lint:changed`：通過。
- `pnpm interview:memory-dry-run`：通過。
- `pnpm interview:park-loop-dry-run`：通過。
- `pnpm interview:theater-build-dry-run`：通過。
- `pnpm build`：通過。
- Browser proof `/interview` desktop 1440x1000：console error 0、scrollWidth = clientWidth、voice shell/consent/transcript visible。
- Browser proof `/interview` mobile 390x844：console error 0、scrollWidth = clientWidth、voice shell/correction visible。
- Headless Chrome permission/fallback smoke：不接受真實麥克風權限；UI 顯示 permission denied 或 unsupported fallback，文字模式仍可見，console error 0。

## 失敗與風險

- 無驗收失敗。
- 本輪未接 Realtime provider；Live transcript 仍是可編輯 placeholder，不代表 production speech-to-text ready。
- Browser safety 不代替使用者接受麥克風 permission prompt；permission/fallback proof 以 headless smoke 驗證 denied/unsupported path。

## 剩餘上線 blocker

- PIM-005：新增 Realtime session BFF、event mirror、ephemeral token policy、quota/session guard、provider usage evidence。
- PIM-006：Prisma persistence for turns/memory/reflection，需要 DB target 與 schema/db push approval。
- PIM-008：Confirmation card / CRM writeback boundary，避免 inference 寫成 confirmed CRM fact。

## 下一輪建議入口

PIM-005 — Realtime session BFF + event mirror。先讀 Next.js route docs 與 OpenAI Realtime 官方文件，新增 authenticated short-lived session route、event mirror route、quota guard 與 no-secret response proof。
