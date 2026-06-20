# Codex / AGENTS.md Development Loop 健檢報告

## 1. 總結判斷

目前自動化開發流程健康度是 **中上，但需要更硬的反重複與策略閘門**。`AGENTS.md` 已有上線阻擋最小化、完整切片、tsc/lint/report/issue-question 與 commit/push 收尾規則，並不是只鼓勵低風險小修。`lv3-immersive-loop.md` 也已經有 cadence review、top-3 scoring、quiet continuation、latest reports reading 與 push 暫停規則，所以核心機制已存在。

主要風險是主真相源與 automation prompt 不完全同步：`AGENTS.md` 原本沒有明確要求讀最近三輪、判斷重複、將研究轉成實作產物、或在同類 blocker 重複時升級成 blocker analysis。近期 reports 顯示系統能記住 Supabase DB/DNS blocker 與 build font blocker，但也已出現 quiet proof-plan / whole-product review 的文件迴圈風險。研究轉化能力存在，而且比一般專案強，特別是 `RES-018 -> PLN-019 -> ACC-011`、`RES-021 -> PLN-022 -> ACC-014`，但缺少全域層級的「每個研究輸入必須映射到實作切片」硬規則。

本輪已安全修改 agent loop 文件：把 Strategic Review Gate、Anti-Repetition Rule、Research-to-Implementation Loop、Acceptance-Driven Slice、Manual Blocker Fallback、Escalation Rule 與 task levels 寫回 `AGENTS.md`，並同步加強 LV3 normal loop 與 whole-product review prompt。

## 2. 主要風險

| 風險 | 證據位置 | 可能後果 | 嚴重度 | 建議 |
| -- | ---- | ---- | --- | -- |
| `AGENTS.md` 主真相源原本缺少明確 anti-repeat gate | `AGENTS.md` 的「整晚總目標」強調上線阻擋與完整切片，但原本沒有要求分類最近兩輪或禁止連續 docs-only；本輪已新增 `Strategic Development Loop Guardrails` | agent 可一直做 proof-plan/report/checklist，仍符合「留下 report」但產品能力未增加 | High | 已補規則；下一輪需在 final/report 寫 last-two-loop classification |
| Workstream 清單很長且多數卡含完成註記 | `AGENTS.md` 多條 workstream 從 UI、RAS、BFF、LCH、AMM、REL 都在同一檔；`Batch Task 操作模型` 原本要求撿最低未阻擋卡 | agent 容易被局部最低卡牽引，忽略真正 release blocker 或 cross-flow target | High | 每輪先回答主目標、最近三輪、當前瓶頸與選卡理由 |
| Quiet documentation loop 可能變成安全出口 | `lv3-immersive-loop.md` 原本允許 heartbeat 沒通知價值時跑 quiet gap-research documentation loop | DB/auth blocked 時可能連續產出研究/證據計畫，而不是實作 fallback 或 unblock plan | Medium | 已加「不得連續兩輪 quiet docs，除非轉成 L2/L3/L4」 |
| 重複 blocker 升級規則不夠硬 | `issue-question.md` 已兩次記錄 Supabase DB/DNS blocker；最近 report 也重複提到 DB blocked 與 build fallback | 同一 external blocker 反覆出現在 report，但沒有自動逼出最小 operator action 或 no-DB release-hardening | High | 已加 Escalation Rule；同 blocker 兩次後必做 blocker analysis |
| 研究轉化已有案例但缺全域契約 | `PLN-019` 明確把 full-site BFF research 轉為 batch tasks；`ACC-011` 有驗收 gate；`PLN-022/ACC-014` 也完整 | 新的 `RES-023/025/026` 或 untracked prototype 可能停在研究/文件，不進入可驗收產物 | Medium | 已加 Research-to-Implementation Loop；新 RES 必須映射到 PLN/ACC/test/prototype |
| README 仍是 create-next-app 模板 | `README.md` 仍指向 `app/page.tsx`、npm/yarn/bun boilerplate | 新 agent 或人類讀者可能走錯入口，不知道 AGENTS/docs/loop prompt 才是真正操作源 | Medium | 下一輪可做 repo onboarding docs hygiene，但僅在高價值任務 blocked 時做 |
| Formal docs 與 generated loop docs 分流 | 正式 docs 使用 `MAN-000/MAN-001` 治理；agent loop reports/prompts 在 `docs/2_agent-input/generated/agent-loop/` | 有些重要 loop prompt 規則不一定回流到 `AGENTS.md` | Medium | 已回流核心規則；後續所有 prompt-only 新規需同步 AGENTS |
| Build blocker 已知但未被硬性升級 | `issue-question.md` Operator 手動處理記錄 Next/Turbopack font blocker；`PLN-017` 也列為 no-DB fallback | DB 繼續 blocked 時，agent 可能繼續寫 DB proof plan，而不是修 build | High | 下一輪若 DB 未恢復，優先 LCH-009 build-font release-hardening |

## 3. 目前流程缺少的關鍵機制

- **anti-repeat rule**：避免連續做文件整理、checklist、proof-plan；重要是防止「每輪都有 commit，但產品能力沒變」。
- **strategic review gate**：每輪開始先判斷主目標、最近三輪、當前瓶頸與本輪差異；重要是讓 agent 不被局部最低卡綁架。
- **research-to-implementation mapping**：每份研究都要轉成 data model、UI flow、API contract、test 或 acceptance；重要是防止研究歸檔而不進產品。
- **acceptance-driven planning**：每輪必須對應 acceptance item、roadmap item、research hypothesis 或 issue；重要是讓「有效推進」可驗收。
- **manual-blocker fallback**：DB/auth/env/provider blocked 時先改做 contract/static/build/schema proof；重要是避免只寫 MANUAL_REQUIRED。
- **escalation rule**：同 blocker 重複兩次就升級為 blocker analysis；重要是逼出根因與最小外部動作。
- **product capability metric**：報告需標明本輪新增哪個產品能力、proof 能力或 blocker 消除；重要是區分「文件漂亮」與「產品前進」。
- **prompt/source synchronization**：prompt 中的新規則要回流 `AGENTS.md`；重要是保證所有 agent 讀到同一操作模型。

## 4. 已新增到 AGENTS.md 的規則

本輪已直接加入 `AGENTS.md` 的 `Strategic Development Loop Guardrails`：

```markdown
### Strategic Development Loop Guardrails（必做）

每輪不是只「撿一張安全卡」；必須先做一次短策略判斷，確認本輪能有效推進產品能力、研究轉化或 release evidence。

1. Strategic Review Gate：選卡前先讀 AGENTS、相關 PLN/ACC/RES、loop-state、issue-question 與最近 3-5 份 loop report。
2. Anti-Repetition Rule：若連續兩輪主要成果都是文件整理、checklist、proof-plan 或 evidence report，下一輪不得再做同類型任務。
3. Research-to-Implementation Loop：每份 RES/研究筆記都要映射到 product concept、data model、UI flow、API contract、prototype、test、acceptance criteria、user-facing workflow 或 evidence report。
4. Acceptance-Driven Slice：每輪必須引用 acceptance item、roadmap item、research hypothesis 或 issue-question。
5. Manual Blocker Fallback：DB/auth/env/external service 阻擋時，先做 contract test、schema review、mock/fixture boundary test、static source proof、setup checklist 或 release-proof fallback。
6. Escalation Rule：同一 blocker 連續出現兩次時，停止小修與重複 proof-plan，改產出 blocker analysis。
7. Task Level Bias：優先 L2-L4；L0 = hygiene，L1 = proof，L2 = implementation slice，L3 = research translation，L4 = architecture/blocker review。
```

## 5. 建議新增的 Codex Loop Prompt

```text
Run one ASAI automation loop.

1. Read context:
   - AGENTS.md
   - loop-state.json
   - issue-question.md
   - latest 3-5 loop reports
   - relevant PLN/ACC/RES/ARC for candidate work
   - package.json and git status

2. Detect repetition:
   - Classify the last two loops as implementation, proof, research translation, documentation/checklist, or blocker review.
   - If both were documentation/checklist/proof-plan/evidence-report, do not choose another same-type task.

3. Identify current bottleneck:
   - Name the current product/release target.
   - Name the highest blocker by severity/leverage.
   - Decide whether this turn should be L1 proof, L2 implementation, L3 research translation, or L4 blocker analysis.

4. Choose one meaningful slice:
   - Map it to a product capability, research hypothesis, acceptance item, roadmap item, or issue-question.
   - Score top 3 candidates and pick the highest safe slice.

5. Implement or produce proof:
   - Prefer L2/L3 work.
   - If DB/auth/env/provider is blocked, do contract/static/schema/build proof or an unblock plan.
   - Do not claim mock/fixture output as production or DB-backed proof.

6. Validate:
   - Always run git status at start/end.
   - Always run pnpm exec tsc --noEmit --pretty false.
   - Always run pnpm lint:changed.
   - Run targeted QA for the selected slice.

7. Record next-step decision:
   - Write a report with last-two-loop classification, selected task level, product/acceptance mapping, validation, blockers, and next prompt.
   - Update issue-question only for real operator decisions or external blockers.
   - Stage only related files, commit locally, and skip push while the 2026-06-20 push pause remains active.
```

## 6. 建議的任務分級系統

| Level | 任務類型 | 例子 | 何時使用 |
| ----- | -------- | ---- | -------- |
| L0 | hygiene | typo、format、單純同步 checklist | 只能在沒有更高價值且安全任務時 |
| L1 | proof | static proof、contract test、build/tsc/lint evidence、recovery proof | external blocker 存在但仍可產生有效 evidence 時 |
| L2 | implementation slice | 小型 BFF/API/UI/domain 切片 | 常規 automation 優先 |
| L3 | research translation | research -> data model / API contract / UI flow / test / acceptance | 新研究輸入後優先，避免研究歸檔 |
| L4 | architecture/blocker review | repeated DB/auth/build blocker root-cause and unblock plan | 同類 blocker 重複兩次或跨 workstream 卡住時 |

## 7. 最後建議

現在最該改的是 **AGENTS.md + Codex loop prompt**，本輪已完成。acceptance checklist 已經相對強，尤其 `ACC-011` 與 `ACC-014`；reports 結構也可用，真正問題是 reports 之間缺 anti-repeat gate 與升級條件。

下一輪 Codex 最適合做：

1. 若 Supabase DB/DNS 已恢復：執行 `ITA-003f/S1 Route B relationship-graph stage map (no-provider)`。
2. 若 DB/DNS 仍 blocked：執行 `LCH-009 production build font blocker fallback`，先讀 Next 16 bundled docs，修 `next/font/google` / Turbopack build blocker，跑 `pnpm build`。

不應再重複做：同一 Supabase blocker 的 proof-plan、只整理 checklist 的 quiet loop、未連到 acceptance 的研究歸檔、未新增 evidence 的 whole-product review。

應變成硬性規則：Strategic Review Gate、Anti-Repetition Rule、Research-to-Implementation Loop、Acceptance-Driven Slice、Manual Blocker Fallback、Escalation Rule、Task Level Bias。

## 8. 本輪修改與驗收

Changed files:

- `AGENTS.md`：新增 Strategic Development Loop Guardrails。
- `docs/2_agent-input/generated/agent-loop/prompts/lv3-immersive-loop.md`：新增 anti-repetition gate、task levels、last-two-loop classification 要求。
- `docs/2_agent-input/generated/agent-loop/prompts/lv3-whole-product-gap-review-loop.md`：新增 anti-duplicate review gate。
- `docs/2_agent-input/generated/agent-loop/reports/2026-06-21_codex-development-loop-health-check.md`：本健檢報告。

Validation:

- `git diff --check -- AGENTS.md docs/2_agent-input/generated/agent-loop/prompts/lv3-immersive-loop.md docs/2_agent-input/generated/agent-loop/prompts/lv3-whole-product-gap-review-loop.md docs/2_agent-input/generated/agent-loop/reports/2026-06-21_codex-development-loop-health-check.md`：pass。
- `pnpm exec tsc --noEmit --pretty false`：pass。
- `pnpm lint:changed`：pass（script linted 161 changed files vs `origin/main` and exited 0）。

Risks:

- 目前 worktree 仍有本輪外既有 dirty / untracked files，本輪不得 stage。
- README 仍是 boilerplate，建議只在 release/blocker 任務被阻擋時另做 onboarding docs cleanup。
