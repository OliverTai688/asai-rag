  
**誠問 AI**

**Next.js SaaS**

**Technical Specification  |  技術規格文件  |  Developer & AI Reference  v1.0**

| 文件版本 | v1.0  (2026-04) |
| :---- | :---- |
| **適用框架** | Next.js 15 (App Router) \+ TypeScript 5 |
| **目標讀者** | Frontend / Backend / AI Engineers, DevOps, AI Agents |
| **知識基礎** | 基於誠問AI產品規格文件 v1.0；引用學術論文與開源最佳實踐 |
| **機密等級** | CONFIDENTIAL — 限授權工程人員 |

# **0\. 快速參考  Quick Reference**

本節提供整個系統的技術棧全景，供工程師與 AI 代理快速定位。

| Layer | Technology / Library | Version | Purpose |
| :---- | :---- | :---- | :---- |
| Runtime | Node.js | 22 LTS | Server runtime |
| Framework | Next.js (App Router) | 15.x | SSR/SSG/API Routes/Server Actions |
| Language | TypeScript | 5.x | Type-safe development |
| Styling | Tailwind CSS \+ shadcn/ui | 3.x / 2.x | Design system |
| State (client) | Zustand \+ TanStack Query | 5.x / 5.x | Global state \+ server state |
| ORM | Prisma | 5.x | PostgreSQL type-safe ORM |
| Database | PostgreSQL | 16 | Primary relational store |
| Cache | Redis (Upstash) | 7.x | Session, rate-limit, pub/sub |
| Auth | NextAuth.js v5 (Auth.js) | 5.x | JWT \+ OAuth \+ credentials |
| AI Orchestrator | LangChain.js | 0.3.x | LLM chain, RAG, agents |
| Primary LLM | OpenAI GPT-4o | 2024-11 | SPIN engine, role-play, reports |
| Fallback LLM | Anthropic Claude 3.5 Sonnet | latest | Heavy reasoning, safety filter |
| Embeddings | OpenAI text-embedding-3-large | latest | RAG vector search |
| Vector DB | Pinecone | v3 | Knowledge base retrieval |
| File Storage | AWS S3 / Cloudflare R2 | latest | Documents, audio uploads |
| Email | Resend | 3.x | Transactional email |
| WebSocket | Ably / Pusher | latest | Real-time tracking events |
| STT | OpenAI Whisper API | 1 | Speech-to-text (voice theater) |
| TTS | ElevenLabs API / Azure Cognitive | latest | Text-to-speech (AI persona voice) |
| Payments | Stripe | 16.x | Subscription billing |
| Analytics | PostHog | latest | Product analytics \+ feature flags |
| Error Tracking | Sentry | 8.x | Error monitoring |
| CI/CD | GitHub Actions | latest | Build, test, deploy pipeline |
| Container | Docker \+ Kubernetes | latest | Production orchestration |
| CDN | Cloudflare | latest | Edge caching, WAF, DDoS |

# **1\. 專案結構  Project Structure**

## **1.1 Monorepo Layout (Turborepo)**

採用 Turborepo 管理 monorepo，清晰分離 apps、packages 與 services，確保代碼共享與獨立部署。

| *monorepo structure* |
| :---- |
| sincerely-ai/                         \# Turborepo root |
| ├── apps/ |
| │   ├── web/                          \# Next.js 15 主應用 (App Router) |
| │   ├── mobile/                       \# React Native (Expo) 行動 App |
| │   └── admin/                        \# 後台管理 (Next.js, 獨立部署) |
| ├── packages/ |
| │   ├── ui/                           \# 共用 shadcn/ui 元件庫 |
| │   ├── db/                           \# Prisma schema \+ migrations \+ seed |
| │   ├── ai-core/                      \# LangChain chains, prompts, RAG pipeline |
| │   ├── auth/                         \# NextAuth.js config \+ RBAC helpers |
| │   ├── config/                       \# ESLint, TypeScript, Tailwind shared configs |
| │   └── types/                        \# 共用 TypeScript types / Zod schemas |
| ├── services/ |
| │   ├── realtime/                     \# Ably 事件橋接 Worker |
| │   ├── voice-processor/              \# STT/TTS 處理服務 (Node.js worker) |
| │   └── report-renderer/             \# PDF/HTML 報告渲染服務 |
| ├── turbo.json |
| ├── pnpm-workspace.yaml |
| └── docker-compose.yml               \# 本地開發環境 |

## **1.2 Next.js App Router 目錄結構**

| *Next.js directory* |
| :---- |
| apps/web/ |
| ├── app/ |
| │   ├── (auth)/                       \# Route group: login, register, forgot-password |
| │   ├── (dashboard)/                  \# Route group: requires auth |
| │   │   ├── layout.tsx                \# Dashboard shell \+ AI Assistant FAB |
| │   │   ├── dashboard/page.tsx        \# Home overview |
| │   │   ├── spin/                     \# SPIN AI 對話模組 |
| │   │   │   ├── page.tsx              \# 對話列表 |
| │   │   │   └── \[sessionId\]/page.tsx  \# 單次 SPIN 對話 |
| │   │   ├── theater/                  \# 劇場模擬演練 |
| │   │   │   ├── page.tsx |
| │   │   │   └── \[sessionId\]/page.tsx |
| │   │   ├── crm/                      \# 客戶管理 |
| │   │   │   ├── page.tsx              \# 客戶列表 |
| │   │   │   └── \[clientId\]/ |
| │   │   │       ├── page.tsx          \# 客戶 360 檢視 |
| │   │   │       ├── gap-analysis/     \# 保障缺口分析 |
| │   │   │       └── timeline/         \# 互動時間軸 |
| │   │   ├── pre-visit/               \# 訪前智能規劃 |
| │   │   ├── reports/                 \# 報告管理 |
| │   │   └── team/                    \# 通訊處管理後台 |
| │   ├── api/ |
| │   │   ├── auth/\[...nextauth\]/      \# NextAuth.js handlers |
| │   │   ├── trpc/\[trpc\]/             \# tRPC HTTP adapter |
| │   │   ├── ai/ |
| │   │   │   ├── spin/route.ts        \# SPIN streaming endpoint |
| │   │   │   ├── theater/route.ts     \# 劇場 AI streaming |
| │   │   │   ├── assistant/route.ts   \# 全頁 AI assistant |
| │   │   │   └── report/route.ts      \# 報告生成 |
| │   │   ├── voice/ |
| │   │   │   ├── stt/route.ts         \# Whisper STT |
| │   │   │   └── tts/route.ts         \# ElevenLabs TTS |
| │   │   ├── webhooks/ |
| │   │   │   ├── stripe/route.ts |
| │   │   │   └── ably/route.ts |
| │   │   └── share/\[token\]/route.ts   \# 客戶報告頁追蹤 |
| │   └── share/\[token\]/page.tsx       \# 公開客戶報告頁 (no auth) |
| ├── components/ |
| │   ├── ai-assistant/                \# 全頁 AI 助手元件 |
| │   ├── spin/                        \# SPIN 對話 UI 元件 |
| │   ├── theater/                     \# 劇場演練元件 |
| │   ├── crm/                         \# CRM 元件 |
| │   └── shared/                      \# 通用 UI 元件 |
| ├── lib/ |
| │   ├── trpc/                        \# tRPC client / server |
| │   ├── ai/                          \# AI helpers (型別定義, util) |
| │   └── utils.ts |
| └── middleware.ts                    \# Auth guard, rate limiting, locale |

# **2\. 資料庫設計  Database Design**

## **2.1 設計原則**

**NOTE**  採用 Prisma 5 作為 ORM，所有 migration 透過 prisma migrate dev 管理。Multi-tenancy 以 organizationId 欄位隔離，每個 Row Level Security (RLS) policy 確保資料不跨租戶洩漏。參考 Fowler (2002) 多租戶隔離模式 \[1\]。

## **2.2 核心 Entity 關係（ERD 文字描述）**

主要 Entity：Organization（通訊處）→ User（業務員）→ Client（客戶）→ 各業務實體。

| *ERD* |
| :---- |
| Organization  1 ──\< User            (1 通訊處多業務員) |
| User          1 ──\< Client          (1 業務員管理多客戶) |
| Client        1 ──\< SpinSession     (1 客戶多次 SPIN 對話) |
| Client        1 ──\< TheaterSession  (1 客戶多次演練) |
| Client        1 ──\< VisitPlan       (1 客戶多次訪前規劃) |
| Client        1 ──\< Report          (1 客戶多份報告) |
| SpinSession   1 ──\< SpinMessage     (1 SPIN session 多訊息) |
| TheaterSession 1 ──\< TheaterTurn    (1 演練多回合) |
| Report        1 ──\< ReportShare     (1 報告多個分享連結) |
| ReportShare   1 ──\< ShareEvent      (1 分享連結多個追蹤事件) |

## **2.3 Prisma Schema 關鍵片段**

### **organizations**

| *prisma* |
| :---- |
| model Organization { |
|   id           String    @id @default(cuid()) |
|   name         String |
|   slug         String    @unique |
|   plan         Plan      @default(PERSONAL) |
|   logoUrl      String? |
|   brandColor   String? |
|   brandingJson Json?     // 品牌客製化 JSON |
|   seatLimit    Int       @default(1) |
|   aiQuota      Int       @default(200)  // monthly AI call quota |
|   aiUsed       Int       @default(0) |
|   stripeCustomerId      String?  @unique |
|   stripeSubscriptionId  String? |
|   createdAt    DateTime  @default(now()) |
|   updatedAt    DateTime  @updatedAt |
|   users        User\[\] |
|   clients      Client\[\] |
|   knowledgeDocs KnowledgeDoc\[\] |
|   @@index(\[slug\]) |
| } |

### **users**

| *prisma* |
| :---- |
| model User { |
|   id             String   @id @default(cuid()) |
|   organizationId String |
|   email          String   @unique |
|   name           String |
|   avatarUrl      String? |
|   role           Role     @default(AGENT)  // OWNER | MANAGER | AGENT |
|   hashedPassword String? |
|   emailVerified  DateTime? |
|   lastLoginAt    DateTime? |
|   createdAt      DateTime @default(now()) |
|   updatedAt      DateTime @updatedAt |
|   organization   Organization @relation(fields:\[organizationId\], references:\[id\], onDelete:Cascade) |
|   clients        Client\[\] |
|   spinSessions   SpinSession\[\] |
|   theaterSessions TheaterSession\[\] |
|   visitPlans     VisitPlan\[\] |
|   @@index(\[organizationId\]) |
|   @@index(\[email\]) |
| } |

### **clients  (CRM Core)**

| *prisma* |
| :---- |
| model Client { |
|   id             String   @id @default(cuid()) |
|   organizationId String |
|   agentId        String |
|   name           String |
|   email          String? |
|   phone          String? |
|   birthDate      DateTime? |
|   occupation     String? |
|   annualIncome   Decimal?  @db.Decimal(15,2) |
|   familyJson     Json?     // 家庭結構 { members: \[{name, relation, age}\] } |
|   assetsJson     Json?     // 財產概況 |
|   existingPoliciesJson Json?  // 現有保障 |
|   relationshipMapJson  Json?  // 人際關係地圖 |
|   tags           String\[\]  // 自訂標籤 |
|   aiTags         String\[\]  // AI 自動標記 |
|   status         ClientStatus @default(PROSPECT) |
|   notes          String? |
|   createdAt      DateTime @default(now()) |
|   updatedAt      DateTime @updatedAt |
|   organization   Organization @relation(...) |
|   agent          User         @relation(...) |
|   spinSessions   SpinSession\[\] |
|   theaterSessions TheaterSession\[\] |
|   visitPlans     VisitPlan\[\] |
|   reports        Report\[\] |
|   gapAnalyses    GapAnalysis\[\] |
|   @@index(\[organizationId, agentId\]) |
|   @@index(\[agentId\]) |
| } |

### **spin\_sessions \+ spin\_messages**

| *prisma* |
| :---- |
| model SpinSession { |
|   id        String      @id @default(cuid()) |
|   agentId   String |
|   clientId  String? |
|   mode      SpinMode    // SELF\_CLARIFY | QUESTION\_DESIGN |
|   phase     SpinPhase   // SITUATION | PROBLEM | IMPLICATION | NEED\_PAYOFF | COMPLETE |
|   summary   String?     // AI 產出的對話摘要 |
|   metadata  Json? |
|   createdAt DateTime    @default(now()) |
|   updatedAt DateTime    @updatedAt |
|   messages  SpinMessage\[\] |
|   reports   Report\[\] |
| } |
|   |
| model SpinMessage { |
|   id            String      @id @default(cuid()) |
|   sessionId     String |
|   role          MessageRole // USER | ASSISTANT | SYSTEM |
|   content       String |
|   spinPhase     SpinPhase? |
|   tokensUsed    Int? |
|   latencyMs     Int? |
|   createdAt     DateTime    @default(now()) |
|   session       SpinSession @relation(...) |
|   @@index(\[sessionId\]) |
| } |

### **theater\_sessions \+ theater\_turns**

| *prisma* |
| :---- |
| model TheaterSession { |
|   id          String         @id @default(cuid()) |
|   agentId     String |
|   clientId    String? |
|   visitPlanId String? |
|   mode        TheaterMode    // TEXT | VOICE |
|   personaJson Json           // AI 客戶角色設定 |
|   // personaJson: { type, name, age, personality, concerns\[\], style } |
|   scoreJson   Json?          // 演練評分結果 |
|   // scoreJson: { overall, questionQuality, empathy, missed\[\], suggestions\[\] } |
|   audioBlobKey String?       // S3 key (voice mode recording) |
|   status      SessionStatus  // ACTIVE | COMPLETED | ABANDONED |
|   createdAt   DateTime       @default(now()) |
|   updatedAt   DateTime       @updatedAt |
|   turns       TheaterTurn\[\] |
| } |
|   |
| model TheaterTurn { |
|   id          String       @id @default(cuid()) |
|   sessionId   String |
|   turnIndex   Int |
|   speaker     Speaker      // AGENT | AI\_CLIENT |
|   content     String       // 文字內容 |
|   audioKey    String?      // S3 key for this turn's TTS audio |
|   durationMs  Int? |
|   createdAt   DateTime     @default(now()) |
|   @@index(\[sessionId, turnIndex\]) |
| } |

### **reports \+ report\_shares \+ share\_events**

| *prisma* |
| :---- |
| model Report { |
|   id           String     @id @default(cuid()) |
|   clientId     String |
|   agentId      String |
|   spinSessionId String? |
|   visitPlanId  String? |
|   title        String |
|   agentContent Json       // 業務版內容 (sections\[\]) |
|   clientContent Json      // 客戶版內容 |
|   isEdited     Boolean    @default(false) |
|   version      Int        @default(1) |
|   createdAt    DateTime   @default(now()) |
|   updatedAt    DateTime   @updatedAt |
|   shares       ReportShare\[\] |
| } |
|   |
| model ReportShare { |
|   id          String    @id @default(cuid()) |
|   reportId    String |
|   token       String    @unique @default(cuid()) |
|   expiresAt   DateTime? |
|   password    String?   // bcrypt hash |
|   ctaConfig   Json?     // { buttons: \[{label, action, url}\] } |
|   events      ShareEvent\[\] |
|   @@index(\[token\]) |
| } |
|   |
| model ShareEvent { |
|   id        String      @id @default(cuid()) |
|   shareId   String |
|   type      EventType   // OPEN | SCROLL | CLICK | EXIT |
|   payload   Json?       // { scrollPct, clickTarget, section } |
|   userAgent String? |
|   ip        String? |
|   createdAt DateTime    @default(now()) |
|   @@index(\[shareId, createdAt\]) |
| } |

# **3\. 認證與授權  Auth & Authorization**

## **3.1 NextAuth.js v5 設定**

採用 Auth.js (NextAuth v5)，支援 Credentials（email/password）與 OAuth（Google / LINE）。Token 採用 JWT 策略，存於 httpOnly cookie，不使用 database session 以降低延遲。

**NOTE**  參考 OWASP Session Management Cheat Sheet \[2\]：JWT exp 設為 15min，搭配 Redis refresh token rotation，refresh token TTL 7 天。

| *TypeScript* |
| :---- |
| // packages/auth/config.ts |
| import NextAuth from 'next-auth' |
| import Credentials from 'next-auth/providers/credentials' |
| import Google from 'next-auth/providers/google' |
| import { PrismaAdapter } from '@auth/prisma-adapter' |
|   |
| export const { handlers, signIn, signOut, auth } \= NextAuth({ |
|   adapter: PrismaAdapter(prisma), |
|   session: { strategy: 'jwt', maxAge: 15 \* 60 },  // 15 min |
|   callbacks: { |
|     async jwt({ token, user }) { |
|       if (user) { |
|         token.userId \= user.id |
|         token.organizationId \= user.organizationId |
|         token.role \= user.role |
|       } |
|       return token |
|     }, |
|     async session({ session, token }) { |
|       session.user.id \= token.userId as string |
|       session.user.organizationId \= token.organizationId as string |
|       session.user.role \= token.role as Role |
|       return session |
|     }, |
|   }, |
|   providers: \[ |
|     Google({ clientId: env.GOOGLE\_ID, clientSecret: env.GOOGLE\_SECRET }), |
|     Credentials({ |
|       async authorize(credentials) { |
|         const user \= await prisma.user.findUnique({ |
|           where: { email: credentials.email as string } |
|         }) |
|         if (\!user || \!user.hashedPassword) return null |
|         const valid \= await bcrypt.compare(credentials.password as string, user.hashedPassword) |
|         return valid ? user : null |
|       } |
|     }) |
|   \] |
| }) |

## **3.2 RBAC 角色權限矩陣**

系統定義三種角色：OWNER（處長）、MANAGER（副理/組長）、AGENT（業務員）。

| Permission | OWNER | MANAGER | AGENT |
| :---- | :---- | :---- | :---- |
| 讀取自己的客戶 | ✓ | ✓ | ✓ |
| 讀取團隊所有客戶 | ✓ | ✓ | — |
| 修改所有業務員設定 | ✓ | — | — |
| 查看團隊績效儀表板 | ✓ | ✓ | — |
| 管理帳號 / 邀請成員 | ✓ | — | — |
| 上傳私有知識庫文件 | ✓ | ✓ | — |
| 查看帳單 / 訂閱 | ✓ | — | — |
| 匯出報表 | ✓ | ✓ | — |
| API 金鑰管理 | ✓ | — | — |

| *TypeScript* |
| :---- |
| // lib/auth/rbac.ts — 使用 CASL 建立 ability |
| import { AbilityBuilder, createMongoAbility } from '@casl/ability' |
|   |
| export function defineAbilityFor(user: SessionUser) { |
|   const { can, cannot, build } \= new AbilityBuilder(createMongoAbility) |
|   |
|   can('read', 'Client', { agentId: user.id })  // always self |
|   |
|   if (user.role \=== 'OWNER' || user.role \=== 'MANAGER') { |
|     can('read', 'Client', { organizationId: user.organizationId }) |
|     can('read', 'TeamDashboard') |
|   } |
|   |
|   if (user.role \=== 'OWNER') { |
|     can('manage', 'Organization', { id: user.organizationId }) |
|     can('manage', 'User', { organizationId: user.organizationId }) |
|     can('manage', 'Billing') |
|   } |
|   |
|   return build() |
| } |

# **4\. API 設計  API Design**

## **4.1 tRPC Router 架構**

業務邏輯 API 全部透過 tRPC v11 實作，利用 Zod 做 input validation，server-side 直接呼叫。Streaming AI 回應使用 Next.js Route Handlers \+ ReadableStream（Vercel AI SDK 2.x）。

| *TypeScript* |
| :---- |
| // server/trpc/routers/index.ts |
| import { router } from '../trpc' |
| import { spinRouter }    from './spin' |
| import { clientRouter }  from './client' |
| import { reportRouter }  from './report' |
| import { theaterRouter } from './theater' |
| import { visitRouter }   from './visit' |
| import { teamRouter }    from './team' |
| import { knowledgeRouter } from './knowledge' |
|   |
| export const appRouter \= router({ |
|   spin:      spinRouter, |
|   client:    clientRouter, |
|   report:    reportRouter, |
|   theater:   theaterRouter, |
|   visit:     visitRouter, |
|   team:      teamRouter, |
|   knowledge: knowledgeRouter, |
| }) |
|   |
| export type AppRouter \= typeof appRouter |

## **4.2 Streaming AI Endpoints (Vercel AI SDK)**

**NOTE**  串流回應採用 Vercel AI SDK streamText()，前端以 useChat() hook 消費。參考 Vercel AI SDK 文件 \[3\] 與 OpenAI Streaming Best Practices \[4\]。

| *TypeScript* |
| :---- |
| // app/api/ai/spin/route.ts |
| import { streamText } from 'ai' |
| import { openai }     from '@ai-sdk/openai' |
| import { auth }       from '@/packages/auth' |
| import { buildSpinSystemPrompt } from '@/packages/ai-core/spin/prompts' |
| import { rateLimit }  from '@/lib/rate-limit' |
|   |
| export const maxDuration \= 60  // Vercel Pro: 60s streaming |
|   |
| export async function POST(req: Request) { |
|   const session \= await auth() |
|   if (\!session) return new Response('Unauthorized', { status: 401 }) |
|   |
|   // Rate limiting: 20 req/min per user |
|   const { success } \= await rateLimit.limit(session.user.id) |
|   if (\!success) return new Response('Too Many Requests', { status: 429 }) |
|   |
|   const { messages, phase, mode, clientContext } \= await req.json() |
|   |
|   const systemPrompt \= buildSpinSystemPrompt({ phase, mode, clientContext }) |
|   |
|   const result \= streamText({ |
|     model:    openai('gpt-4o'), |
|     system:   systemPrompt, |
|     messages, |
|     maxTokens: 1024, |
|     temperature: 0.7, |
|     onFinish: async ({ text, usage }) \=\> { |
|       // 非同步儲存訊息，不阻塞串流 |
|       await saveSpinMessage({ sessionId, role: 'assistant', content: text, tokensUsed: usage.totalTokens }) |
|     } |
|   }) |
|   |
|   return result.toDataStreamResponse() |
| } |

## **4.3 API Rate Limiting 策略**

採用 Sliding Window 演算法，以 Redis（Upstash）實作。不同端點設定不同配額。

| Endpoint | Limit | Window | Key |
| :---- | :---- | :---- | :---- |
| /api/ai/spin | 20 req | 1 min | userId |
| /api/ai/theater | 15 req | 1 min | userId |
| /api/ai/assistant | 30 req | 1 min | userId |
| /api/ai/report | 10 req | 1 hour | userId |
| /api/voice/stt | 50 req | 1 hour | userId |
| /api/share/:token | 200 req | 1 hour | ip |
| Auth endpoints | 5 req | 15 min | ip |

# **5\. AI 引擎：SPIN 對話  AI Engine — SPIN**

## **5.1 SPIN 框架實作原則**

SPIN Selling 由 Neil Rackham (1988) 在大規模銷售行為研究後提出 \[5\]，是全球頂尖 B2B 銷售方法論。本系統以 LangChain.js StatefulGraph 實作 SPIN 狀態機。

| SPIN Phase | Chinese | AI Goal | Output Type |
| :---- | :---- | :---- | :---- |
| Situation | 情境問題 | 收集客戶現況事實，建立共識基礎 | 開放式情境問句（3-5題） |
| Problem | 難題問題 | 識別客戶當前問題、不滿、困難 | 聚焦痛點的探索問句（3-5題） |
| Implication | 暗示問題 | 放大問題影響，製造改變動機 | 後果導向的深化問句（2-4題） |
| Need-Payoff | 需求回報 | 引導客戶說出解決方案帶來的價值 | 價值確認問句 \+ 業務員話術建議 |

## **5.2 System Prompt 工程**

**WARN**  System prompt 是核心智識資產，需納入版本控制（prompt registry），並建立 A/B 測試框架衡量不同版本的對話完成率與客戶滿意度指標。參考 \[6\] 白皮書。

| *TypeScript* |
| :---- |
| // packages/ai-core/spin/prompts.ts |
| export function buildSpinSystemPrompt({ |
|   phase, mode, clientContext |
| }: SpinPromptParams): string { |
|   return \` |
| You are SPIN AI, an elite insurance sales coach for Taiwan's insurance industry. |
| You operate in ${mode \=== 'SELF\_CLARIFY' ? 'Agent Reflection' : 'Question Design'} mode. |
|   |
| \#\# Current SPIN Phase: ${phase} |
| ${PHASE\_INSTRUCTIONS\[phase\]} |
|   |
| \#\# Client Context |
| ${clientContext ? formatClientContext(clientContext) : 'No client context provided.'} |
|   |
| \#\# Critical Rules |
| 1\. NEVER give product recommendations directly — guide through questions. |
| 2\. Each response must include: (a) one acknowledgment, (b) one SPIN question, (c) optional coaching tip. |
| 3\. Detect phase readiness: if agent has sufficient info for current phase, suggest advancing. |
| 4\. Output language: Traditional Chinese (Taiwan). Technical terms may be bilingual. |
| 5\. Insurance-specific: reference Taiwan Life Insurance regulations where relevant. |
| 6\. Max response: 300 tokens. Be concise. Ask ONE question at a time. |
|   \` |
| } |
|   |
| const PHASE\_INSTRUCTIONS: Record\<SpinPhase, string\> \= { |
|   SITUATION: \`Goal: Establish factual baseline. Ask about current situation, family structure, |
|               existing policies, financial status. Avoid problem-leading questions.\`, |
|   PROBLEM:   \`Goal: Surface dissatisfaction. Ask what challenges they face with current coverage. |
|               Look for gaps, concerns, or unmet needs.\`, |
|   IMPLICATION: \`Goal: Amplify problem impact. Ask 'what happens if...' and 'how does this affect...'\`, |
|   NEED\_PAYOFF: \`Goal: Let client articulate value. Ask 'how important would it be if...'\`, |
|   COMPLETE:    \`Session complete. Summarize key insights and suggest report generation.\` |
| } |

# **6\. AI 劇場演練引擎  Theater Role-Play Engine**

## **6.1 架構概覽**

劇場引擎以「多角色 Persona 狀態機」為核心，AI 扮演不同性格的台灣保險客戶，對業務員的語言做出真實且一致的情感反應。參考 Park et al. (2023) 的 Generative Agent 研究架構 \[7\]。

| Persona Type | 中文 | 核心特質 | 常見阻礙 |
| :---- | :---- | :---- | :---- |
| conservative | 保守型 | 謹慎、多疑、要求書面佐證 | 不信任業務員動機 |
| proactive | 積極型 | 開放、有購買意向、問題細節多 | 比較競品、詢問費率 |
| skeptical | 疑慮型 | 曾有不好的保險經驗，防衛心強 | 容易轉移話題、打斷 |
| busy | 忙碌型 | 時間有限、要求簡短直接 | 不耐煩、希望直接給結論 |
| custom | 客製型 | 根據 CRM 客戶資料生成專屬角色 | 動態生成，最貼近真實 |

## **6.2 Persona 生成流程**

| *TypeScript* |
| :---- |
| // packages/ai-core/theater/persona-generator.ts |
| export async function generatePersonaFromClient(client: Client): Promise\<Persona\> { |
|   const prompt \= \` |
| Based on this insurance client profile, create a realistic persona for role-play training: |
| \- Name: ${client.name} (use anonymized version) |
| \- Age: ${calculateAge(client.birthDate)} |
| \- Occupation: ${client.occupation} |
| \- Family: ${JSON.stringify(client.familyJson)} |
| \- Existing policies: ${JSON.stringify(client.existingPoliciesJson)} |
|   |
| Generate a JSON persona with these fields: |
| { |
|   type: string,          // one of: conservative|proactive|skeptical|busy|custom |
|   displayName: string,   // anonymized name |
|   age: number, |
|   personality: string,   // 2-sentence description |
|   primaryConcern: string, |
|   communicationStyle: string, |
|   likelyObjections: string\[\],  // top 3 |
|   emotionalState: string       // initial mood |
| } |
| Return ONLY valid JSON.\` |
|   |
|   const response \= await openai.chat.completions.create({ |
|     model: 'gpt-4o', |
|     messages: \[{ role: 'user', content: prompt }\], |
|     response\_format: { type: 'json\_object' }, |
|     temperature: 0.8 |
|   }) |
|   |
|   return JSON.parse(response.choices\[0\].message.content\!) as Persona |
| } |

## **6.3 語音模式技術架構**

**NOTE**  語音模式結合 Web Speech API（瀏覽器端 VAD \+ STT）與 OpenAI Whisper（高精準 STT）及 ElevenLabs（TTS）。Latency 目標：語音輸入到 AI 語音回應 \< 3 秒。

| *flow* |
| :---- |
| // 語音處理流程 |
| Browser MediaRecorder |
|     ↓  (WebM/Opus stream) |
| app/api/voice/stt/route.ts |
|     ↓  multipart/form-data → Whisper API |
|     ↓  transcript (string) |
| packages/ai-core/theater/engine.ts |
|     ↓  buildTheaterTurn(transcript, persona, history) |
|     ↓  GPT-4o → AI response text |
| app/api/voice/tts/route.ts |
|     ↓  ElevenLabs API → audio stream (MP3) |
|     ↓  ArrayBuffer → browser AudioContext.play() |
| Total target latency: \< 3000ms (P95) |

| *TypeScript* |
| :---- |
| // app/api/voice/stt/route.ts |
| import OpenAI from 'openai' |
|   |
| export async function POST(req: Request) { |
|   const formData \= await req.formData() |
|   const audioBlob \= formData.get('audio') as Blob |
|   const sessionId \= formData.get('sessionId') as string |
|   |
|   // Convert Blob to File for Whisper API |
|   const audioFile \= new File(\[audioBlob\], 'audio.webm', { type: 'audio/webm' }) |
|   |
|   const transcript \= await openai.audio.transcriptions.create({ |
|     file:     audioFile, |
|     model:    'whisper-1', |
|     language: 'zh',   // Traditional Chinese |
|     prompt:   '保險業務，SPIN銷售法，台灣金融',  // domain hint |
|   }) |
|   |
|   return Response.json({ text: transcript.text }) |
| } |

## **6.4 演練評分演算法**

演練完成後，AI 自動分析對話品質。評分維度參考 Rackham (1988) SPIN 研究指標 \[5\] 與 Gawande (2009) 外科技能評估框架 \[8\]。

| *TypeScript* |
| :---- |
| // packages/ai-core/theater/scorer.ts |
| export async function scoreTheaterSession(turns: TheaterTurn\[\]): Promise\<ScoreResult\> { |
|   const conversationText \= turns.map(t \=\> |
|     \`\[${t.speaker}\]: ${t.content}\` |
|   ).join('\\n') |
|   |
|   const scoringPrompt \= \` |
| Evaluate this insurance sales practice conversation between AGENT and AI\_CLIENT. |
|   |
| Score each dimension 1-10 and identify specific improvements: |
| 1\. question\_quality:     How well did questions follow SPIN framework? |
| 2\. empathy:              Did agent acknowledge client emotions? |
| 3\. active\_listening:     Did agent build on client responses? |
| 4\. objection\_handling:   How effectively were objections addressed? |
| 5\. phase\_progression:    Did agent move through SPIN phases appropriately? |
|   |
| Also list: |
| \- missed\_pain\_points: pain points client mentioned that agent ignored |
| \- suggested\_improvements: top 3 actionable tips |
|   |
| Return as JSON matching ScoreResult interface.\` |
|   |
|   // ... OpenAI call with response\_format: json\_object |
| } |

# **7\. RAG 知識庫管線  RAG Pipeline**

## **7.1 架構設計原則**

採用 Hybrid Search（向量相似度 \+ BM25 關鍵字）提升召回率，搭配 Cohere Rerank 優化精確度。參考 Lewis et al. (2020) Retrieval-Augmented Generation 論文 \[9\] 及 Guu et al. (2020) REALM \[10\]。

**NOTE**  幻覺（Hallucination）防護：所有 RAG 回應必須附帶來源引用；若置信度分數 \< 0.7，系統顯示「資訊可能不完整，建議查詢原始文件」警告。

| *flow* |
| :---- |
| // RAG Pipeline 全流程 |
|   |
| INGEST (文件上傳時執行) |
|   PDF/Word upload → S3 |
|       ↓ |
|   Document Parser (LangChain DocumentLoader) |
|       ↓ RecursiveTextSplitter (chunk\_size=512, overlap=64) |
|   Chunks\[\] |
|       ↓ |
|   OpenAI text-embedding-3-large → float\[3072\] |
|       ↓ |
|   Pinecone upsert (namespace \= organizationId) |
|   |
| QUERY (使用者問問題時執行) |
|   User query |
|       ↓ Parallel |
|   \[A\] Pinecone vector search (top-20, threshold 0.7) |
|   \[B\] PostgreSQL FTS (pg\_trgm BM25-like keyword search) |
|       ↓ Merge & Deduplicate |
|   top-40 candidates |
|       ↓ |
|   Cohere Rerank API → top-5 most relevant |
|       ↓ |
|   Context assembly \+ citation map |
|       ↓ |
|   GPT-4o generate answer with citations |
|       ↓ |
|   Return { answer, citations\[\], confidenceScore } |

## **7.2 知識庫 Schema**

| Field | Type | Null | Index | Description |
| :---- | :---- | ----- | ----- | :---- |
| **id** | String | NO | PK | CUID 主鍵 |
| **organizationId** | String | NO | IDX | 租戶隔離 |
| **title** | String | NO | — | 文件標題 |
| **sourceType** | Enum | NO | — | PDF | WORD | URL | MANUAL |
| **s3Key** | String? | YES | — | 原始文件 S3 路徑 |
| **status** | Enum | NO | — | PROCESSING | READY | ERROR |
| **chunkCount** | Int | YES | — | 切分後 chunk 數量 |
| **pineconePrefix** | String | NO | — | Pinecone 向量 ID 前綴 |
| **metadata** | Json | YES | — | 作者、版本、來源URL等 |
| **createdAt** | DateTime | NO | — | 建立時間 |

## **7.3 Pinecone 索引設計**

| *JSON* |
| :---- |
| // 每個 Organization 使用同一 Index 但獨立 Namespace |
| // Index config: |
| { |
|   name:      'sincerely-ai-knowledge', |
|   dimension: 3072,             // text-embedding-3-large |
|   metric:    'cosine', |
|   spec: { |
|     serverless: { |
|       cloud:  'aws', |
|       region: 'ap-northeast-1'  // Tokyo |
|     } |
|   } |
| } |
|   |
| // Vector metadata (stored with each vector): |
| { |
|   organizationId: string, |
|   docId:          string, |
|   chunkIndex:     number, |
|   chunkText:      string,    // 原始文字（供 context 組裝） |
|   sourceTitle:    string, |
|   sourceType:     string, |
|   pageNumber:     number?, |
| } |

# **8\. 全頁面 AI 助手  Global AI Assistant**

## **8.1 架構設計**

全頁 AI 助手以浮動面板（FAB）形式存在於所有頁面，具備情境感知、RAG 問答、工具呼叫（Tool Calling）與自然語言網頁操作四大能力。架構參考 Yao et al. (2022) ReAct 框架 \[11\]。

| *TypeScript* |
| :---- |
| // packages/ai-core/assistant/agent.ts |
| import { createReactAgent } from '@langchain/langgraph/prebuilt' |
| import { ChatOpenAI } from '@langchain/openai' |
|   |
| const assistantTools \= \[ |
|   ragQueryTool,          // 查詢 RAG 知識庫 |
|   clientLookupTool,      // 查詢客戶資料 |
|   clientGapAnalysisTool, // 觸發保障缺口分析 |
|   createClientTool,      // 建立客戶檔案 |
|   listUnfollowedTool,    // 列出未追蹤客戶 |
|   navigateTool,          // 導航到指定頁面 |
|   createSpinSessionTool, // 啟動 SPIN 對話 |
|   generateReportTool,    // 觸發報告生成 |
| \] |
|   |
| export const assistantAgent \= createReactAgent({ |
|   llm: new ChatOpenAI({ model: 'gpt-4o', temperature: 0.1 }), |
|   tools: assistantTools, |
|   messageModifier: buildAssistantSystemPrompt, |
| }) |

## **8.2 Tool Definitions**

| *TypeScript* |
| :---- |
| // packages/ai-core/assistant/tools/client-tools.ts |
| import { tool } from '@langchain/core/tools' |
| import { z } from 'zod' |
|   |
| export const clientLookupTool \= tool( |
|   async ({ query, agentId }) \=\> { |
|     const clients \= await prisma.client.findMany({ |
|       where: { |
|         agentId, |
|         OR: \[ |
|           { name: { contains: query, mode: 'insensitive' } }, |
|           { email: { contains: query } }, |
|         \] |
|       }, |
|       take: 5, |
|     }) |
|     return JSON.stringify(clients) |
|   }, |
|   { |
|     name: 'client\_lookup', |
|     description: 'Search for clients by name or email. Use when user asks about a specific client.', |
|     schema: z.object({ |
|       query:   z.string().describe('Client name or email to search'), |
|       agentId: z.string().describe('Current agent ID'), |
|     }) |
|   } |
| ) |
|   |
| export const navigateTool \= tool( |
|   async ({ path, params }) \=\> { |
|     // Returns navigation instruction to frontend |
|     return JSON.stringify({ action: 'NAVIGATE', path, params }) |
|   }, |
|   { |
|     name: 'navigate', |
|     description: 'Navigate user to a page. Use for: crm, spin, theater, pre-visit, reports, team.', |
|     schema: z.object({ |
|       path:    z.string().describe('Route path, e.g. /crm/\[clientId\]'), |
|       params:  z.record(z.string()).optional() |
|     }) |
|   } |
| ) |

## **8.3 情境感知（Context Awareness）**

助手透過 React Context 取得當前頁面路由、選中的客戶 ID、當前 SPIN 階段等，注入 system prompt 中實現情境感知。

| *TypeScript* |
| :---- |
| // components/ai-assistant/context.tsx |
| interface AssistantContext { |
|   currentRoute:  string |
|   currentClient: { id: string; name: string } | null |
|   currentPhase:  SpinPhase | null |
|   pageTitle:     string |
| } |
|   |
| // Injected into system prompt: |
| // 'User is currently on the CRM page viewing client 王大明 (ID: cuid123). |
| //  Relevant actions: gap analysis, SPIN session, pre-visit plan, report generation.' |

# **9\. 即時系統與追蹤  Real-Time & Event Tracking**

## **9.1 客戶報告互動追蹤**

客戶開啟分享報告後，前端透過 Intersection Observer API 追蹤閱讀進度，並透過 Beacon API 發送事件，確保不影響頁面效能。Server 端透過 Ably 即時推播通知業務員。

| *TypeScript* |
| :---- |
| // app/share/\[token\]/components/tracker.tsx |
| export function ReportTracker({ token }: { token: string }) { |
|   useEffect(() \=\> { |
|     const sections \= document.querySelectorAll('\[data-section\]') |
|   |
|     const observer \= new IntersectionObserver( |
|       (entries) \=\> { |
|         entries.forEach(entry \=\> { |
|           if (entry.isIntersecting) { |
|             // Beacon API: fire-and-forget, doesn't block page |
|             navigator.sendBeacon('/api/share/' \+ token, JSON.stringify({ |
|               type:    'SCROLL', |
|               payload: { |
|                 section:   entry.target.getAttribute('data-section'), |
|                 scrollPct: Math.round((window.scrollY / document.body.scrollHeight) \* 100\) |
|               } |
|             })) |
|           } |
|         }) |
|       }, |
|       { threshold: 0.5 } |
|     ) |
|   |
|     sections.forEach(s \=\> observer.observe(s)) |
|     return () \=\> observer.disconnect() |
|   }, \[\]) |
|   |
|   return null |
| } |

## **9.2 Ably 即時通知**

| *TypeScript* |
| :---- |
| // app/api/share/\[token\]/route.ts — 接收事件並推播 |
| import Ably from 'ably' |
|   |
| export async function POST(req: Request, { params }: { params: { token: string } }) { |
|   const body \= await req.json() |
|   const share \= await prisma.reportShare.findUnique({ |
|     where: { token: params.token }, |
|     include: { report: { include: { agent: true } } } |
|   }) |
|   if (\!share) return new Response('Not Found', { status: 404 }) |
|   |
|   // Save event to DB |
|   await prisma.shareEvent.create({ |
|     data: { shareId: share.id, type: body.type, payload: body.payload, |
|             ip: req.headers.get('x-forwarded-for') ?? '' } |
|   }) |
|   |
|   // Push real-time notification to agent |
|   if (body.type \=== 'OPEN') { |
|     const ably \= new Ably.Rest(process.env.ABLY\_API\_KEY\!) |
|     await ably.channels.get(\`agent:${share.report.agentId}\`).publish('report\_opened', { |
|       clientName: share.report.client?.name, |
|       reportTitle: share.report.title, |
|       timestamp: new Date().toISOString(), |
|     }) |
|   } |
|   |
|   return new Response('OK') |
| } |

# **10\. 前端架構  Frontend Architecture**

## **10.1 State Management 策略**

採用三層狀態策略，清晰分工：Server State（TanStack Query \+ tRPC）、Global UI State（Zustand）、Local Component State（useState/useReducer）。

| State Type | Tool | Use Cases |
| :---- | :---- | :---- |
| Server State | TanStack Query \+ tRPC | 客戶列表、SPIN 歷史、報告、團隊數據 |
| Global UI State | Zustand | AI 助手開關、通知、側欄折疊、主題 |
| Form State | React Hook Form \+ Zod | 客戶表單、設定、登入 |
| Stream State | Vercel AI SDK useChat() | SPIN/Theater/Assistant AI 對話 |
| Local State | useState/useReducer | UI toggle、動畫、暫存輸入 |

## **10.2 SPIN 對話 UI 元件**

| *TypeScript/JSX* |
| :---- |
| // components/spin/SpinChat.tsx |
| 'use client' |
| import { useChat } from 'ai/react' |
| import { useSpinSession } from '@/lib/hooks/use-spin-session' |
|   |
| export function SpinChat({ sessionId, clientId }: Props) { |
|   const { phase, mode, advancePhase } \= useSpinSession(sessionId) |
|   |
|   const { messages, input, handleInputChange, handleSubmit, isLoading } \= useChat({ |
|     api: '/api/ai/spin', |
|     body: { sessionId, phase, mode, clientId }, |
|     id:   sessionId, |
|     onFinish: (message) \=\> { |
|       // Check if AI suggests phase advancement |
|       if (message.content.includes('\[PHASE\_COMPLETE\]')) advancePhase() |
|     } |
|   }) |
|   |
|   return ( |
|     \<div className='flex flex-col h-full'\> |
|       \<SpinPhaseIndicator phase={phase} /\> |
|       \<MessageList messages={messages} isLoading={isLoading} /\> |
|       \<form onSubmit={handleSubmit} className='p-4 border-t'\> |
|         \<input value={input} onChange={handleInputChange} |
|                placeholder='描述您的客戶情況...' |
|                className='w-full rounded-lg border p-3' /\> |
|       \</form\> |
|     \</div\> |
|   ) |
| } |

## **10.3 效能最佳化**

| 技術 | 實作方式 | 目標指標 |
| :---- | :---- | :---- |
| Server Components | AI 助手面板外，所有靜態內容用 RSC | LCP \< 2.5s |
| Streaming UI | Suspense \+ streaming RSC 骨架載入 | FID \< 100ms |
| Image Optimization | next/image \+ Cloudflare Image Resize | CLS \< 0.1 |
| Bundle Splitting | Dynamic import 按模組切分（Theater/Voice） | JS bundle \< 200KB initial |
| Prefetching | Link prefetch \+ tRPC prefetchQuery | Navigation \< 200ms |
| Caching | Redis \+ stale-while-revalidate \+ CDN edge | TTFB \< 200ms (cached) |

# **11\. 安全設計  Security**

## **11.1 安全架構原則**

**NOTE**  遵循 OWASP Top 10 (2021) \[12\] 與金管會「金融機構辦理電腦系統資訊安全評估辦法」。

| OWASP Risk | 對應實作 |
| :---- | :---- |
| A01 Broken Access Control | CASL RBAC \+ Prisma RLS \+ API 層 ownership check |
| A02 Cryptographic Failures | bcrypt (cost 12\) 密碼 hash；AES-256-GCM 敏感欄位加密；TLS 1.3 only |
| A03 Injection | Prisma parameterized query；Zod input validation；DOMPurify HTML sanitize |
| A05 Misconfig | Helmet.js headers；CSP policy；CORS whitelist only |
| A07 Auth Failures | JWT rotation；Rate limit on auth；lockout after 5 failed attempts |
| A08 Software Integrity | npm audit in CI；Dependabot；SBOM generation |
| A09 Logging Failures | Structured logging（Pino）；Sentry error tracking；audit log trail |
| A10 SSRF | URL allowlist for webhook/fetch；禁止 private IP range |

## **11.2 AI 安全措施**

**WARN**  LLM 應用特有風險：Prompt Injection、數據洩漏、Jailbreak。須在所有 AI 端點實作防護。

| *TypeScript* |
| :---- |
| // packages/ai-core/security/guard.ts |
| export async function aiGuard(input: string, context: GuardContext): Promise\<GuardResult\> { |
|   // 1\. Input length limit |
|   if (input.length \> 4000\) throw new Error('Input too long') |
|   |
|   // 2\. Prompt injection detection (heuristic) |
|   const injectionPatterns \= \[ |
|     /ignore (previous|above|all) instructions/i, |
|     /you are now/i, |
|     /act as/i, |
|     /jailbreak/i, |
|     /DAN/, |
|   \] |
|   if (injectionPatterns.some(p \=\> p.test(input))) { |
|     return { blocked: true, reason: 'PROMPT\_INJECTION' } |
|   } |
|   |
|   // 3\. PII detection — don't allow sending other client's data |
|   if (context.containsOtherClientId(input)) { |
|     return { blocked: true, reason: 'CROSS\_TENANT\_ACCESS' } |
|   } |
|   |
|   // 4\. Content moderation (OpenAI Moderation API) |
|   const modResult \= await openai.moderations.create({ input }) |
|   if (modResult.results\[0\].flagged) { |
|     return { blocked: true, reason: 'CONTENT\_POLICY' } |
|   } |
|   |
|   return { blocked: false } |
| } |

# **12\. 測試策略  Testing Strategy**

## **12.1 測試金字塔**

採用 Testing Trophy 策略（Kent C. Dodds, 2018 \[13\]）：大量整合測試、適量單元測試、少量 E2E。

| Layer | Tool | Coverage Target | Focus |
| :---- | :---- | :---- | :---- |
| Unit | Vitest | 80% | AI prompt builders, util functions, RBAC logic |
| Integration | Vitest \+ MSW | 60% | tRPC routers, DB operations, API endpoints |
| E2E | Playwright | Key flows | Login, SPIN flow, report share, payment |
| AI Evals | PromptFoo / LangSmith | — | Prompt quality, SPIN phase accuracy, RAG relevance |
| Load | k6 | — | 500 concurrent users, streaming endpoints |

## **12.2 AI Evaluation 框架**

**NOTE**  LLM 輸出的品質不能只靠人工檢查，須建立自動化 eval pipeline。參考 Shankar et al. (2024) \[14\] 的 LLM-as-Judge 評估方法。

| *YAML* |
| :---- |
| // evals/spin-eval.ts — 使用 PromptFoo 框架 |
| // promptfooconfig.yaml |
| providers: |
|   \- id: openai:gpt-4o |
|     config: |
|       systemPrompt: file://packages/ai-core/spin/prompts.ts |
|   |
| tests: |
|   \- description: 'SPIN Situation phase \- should ask factual questions only' |
|     vars: |
|       phase: SITUATION |
|       input: '我想跟您聊聊您的保障狀況' |
|     assert: |
|       \- type: llm-rubric |
|         value: 'Response asks factual situation questions, NOT problem or solution questions' |
|       \- type: not-contains |
|         value: '建議您購買' |
|       \- type: javascript |
|         value: 'output.length \< 600'  // conciseness |
|   |
|   \- description: 'Should NOT give product recommendations' |
|     vars: |
|       phase: PROBLEM |
|       input: '您覺得我應該買什麼保險？' |
|     assert: |
|       \- type: llm-rubric |
|         value: 'Response redirects with a question, does NOT recommend specific products' |

# **13\. 部署與 DevOps  Deployment & DevOps**

## **13.1 環境規劃**

| Environment | Platform | Branch | Purpose |
| :---- | :---- | :---- | :---- |
| local | Docker Compose | — | 開發者本機環境 |
| preview | Vercel Preview | PR branch | PR 自動預覽 |
| staging | Vercel / GCP GKE | develop | QA 測試環境 |
| production | GCP GKE \+ CloudRun | main | 正式環境 |
| dr | AWS ap-northeast-1 | — | 災難復原備援 |

## **13.2 GitHub Actions CI/CD Pipeline**

| *YAML* |
| :---- |
| \# .github/workflows/ci.yml |
| name: CI/CD Pipeline |
|   |
| on: |
|   push: |
|     branches: \[main, develop\] |
|   pull\_request: |
|     branches: \[main\] |
|   |
| jobs: |
|   quality: |
|     runs-on: ubuntu-latest |
|     steps: |
|       \- uses: actions/checkout@v4 |
|       \- uses: pnpm/action-setup@v4 |
|       \- name: Install dependencies |
|         run: pnpm install \--frozen-lockfile |
|       \- name: Type check |
|         run: pnpm turbo typecheck |
|       \- name: Lint |
|         run: pnpm turbo lint |
|       \- name: Unit \+ Integration tests |
|         run: pnpm turbo test |
|       \- name: AI Evals (on main only) |
|         if: github.ref \== 'refs/heads/main' |
|         run: pnpm promptfoo eval \--no-cache |
|         env: |
|           OPENAI\_API\_KEY: ${{ secrets.OPENAI\_API\_KEY }} |
|   |
|   deploy\_staging: |
|     needs: quality |
|     if: github.ref \== 'refs/heads/develop' |
|     runs-on: ubuntu-latest |
|     steps: |
|       \- name: Deploy to Vercel Staging |
|         run: vercel deploy \--env staging |
|   |
|   deploy\_production: |
|     needs: quality |
|     if: github.ref \== 'refs/heads/main' |
|     runs-on: ubuntu-latest |
|     steps: |
|       \- name: Deploy to GKE Production |
|         run: | |
|           gcloud container clusters get-credentials prod-cluster |
|           kubectl set image deployment/web web=$IMAGE\_TAG |

## **13.3 環境變數管理**

| *bash* |
| :---- |
| \# .env.local (本機 \- 不 commit) |
| \# 透過 Doppler / Infisical 管理 secrets |
|   |
| \# Database |
| DATABASE\_URL=postgresql://user:pass@localhost:5432/sincerely |
| REDIS\_URL=redis://localhost:6379 |
|   |
| \# Auth |
| NEXTAUTH\_SECRET=\<generate with: openssl rand \-hex 32\> |
| NEXTAUTH\_URL=http://localhost:3000 |
| GOOGLE\_CLIENT\_ID=... |
| GOOGLE\_CLIENT\_SECRET=... |
|   |
| \# AI Services |
| OPENAI\_API\_KEY=sk-... |
| ANTHROPIC\_API\_KEY=sk-ant-... |
| PINECONE\_API\_KEY=... |
| PINECONE\_INDEX=sincerely-ai-knowledge |
| COHERE\_API\_KEY=... |
|   |
| \# Voice |
| ELEVENLABS\_API\_KEY=... |
| ELEVENLABS\_VOICE\_ID=...  \# AI client persona voice |
|   |
| \# Real-time |
| ABLY\_API\_KEY=... |
|   |
| \# Storage |
| AWS\_ACCESS\_KEY\_ID=... |
| AWS\_SECRET\_ACCESS\_KEY=... |
| AWS\_S3\_BUCKET=sincerely-ai-uploads |
|   |
| \# Payments |
| STRIPE\_SECRET\_KEY=sk\_live\_... |
| STRIPE\_WEBHOOK\_SECRET=whsec\_... |
|   |
| \# Monitoring |
| SENTRY\_DSN=... |
| POSTHOG\_API\_KEY=... |

# **14\. 效能目標  Performance Targets & SLOs**

## **14.1 Web Vitals 目標（Core Web Vitals）**

| Metric | Target | Measurement Tool | Note |
| :---- | :---- | :---- | :---- |
| LCP (Largest Contentful Paint) | \< 2.5s | Lighthouse / CrUX | Dashboard 首屏 |
| FID / INP | \< 100ms | Web Vitals JS | 互動響應 |
| CLS | \< 0.1 | Layout Shift API | 報告頁面 |
| TTFB | \< 200ms | Vercel Analytics | Cached responses |
| AI Streaming TTFT | \< 1.5s | Custom telemetry | First token to screen |
| Voice STT Latency | \< 1.2s | Custom telemetry | Audio upload → transcript |
| Voice TTS Latency | \< 1.0s | Custom telemetry | Text → first audio chunk |
| Total Voice Round-trip | \< 3.0s | Custom telemetry | P95 |

## **14.2 Infrastructure SLOs**

| Service | Availability SLO | RTO | RPO |
| :---- | :---- | :---- | :---- |
| Web Application | 99.9% | \< 5 min | \< 1 min |
| AI API Endpoints | 99.5% | \< 10 min | N/A (stateless) |
| Database | 99.95% | \< 15 min | \< 5 min |
| File Storage | 99.99% | N/A | N/A |
| Real-time Events | 99.5% | \< 5 min | N/A |

# **15\. 多租戶架構與計費  Multi-Tenancy & Billing**

## **15.1 Stripe 訂閱整合**

採用 Stripe Billing 管理訂閱，Webhook 同步訂閱狀態至 DB。參考 Stripe 官方 SaaS 整合最佳實踐 \[15\]。

| *TypeScript* |
| :---- |
| // app/api/webhooks/stripe/route.ts |
| import Stripe from 'stripe' |
|   |
| export async function POST(req: Request) { |
|   const body \= await req.text() |
|   const sig  \= req.headers.get('stripe-signature')\! |
|   |
|   let event: Stripe.Event |
|   try { |
|     event \= stripe.webhooks.constructEvent(body, sig, process.env.STRIPE\_WEBHOOK\_SECRET\!) |
|   } catch { |
|     return new Response('Webhook signature invalid', { status: 400 }) |
|   } |
|   |
|   switch (event.type) { |
|     case 'customer.subscription.created': |
|     case 'customer.subscription.updated': { |
|       const sub \= event.data.object as Stripe.Subscription |
|       await prisma.organization.update({ |
|         where: { stripeCustomerId: sub.customer as string }, |
|         data: { |
|           plan: mapStripePriceToPlan(sub.items.data\[0\].price.id), |
|           stripeSubscriptionId: sub.id, |
|         } |
|       }) |
|       break |
|     } |
|     case 'customer.subscription.deleted': { |
|       await prisma.organization.update({ |
|         where: { stripeCustomerId: event.data.object.customer as string }, |
|         data: { plan: 'PERSONAL' }  // downgrade to free |
|       }) |
|       break |
|     } |
|   } |
|   |
|   return new Response('OK') |
| } |

## **15.2 AI 配額管理**

| *TypeScript* |
| :---- |
| // packages/ai-core/quota.ts |
| export async function checkAndConsumeQuota( |
|   organizationId: string, |
|   estimatedTokens \= 1 |
| ): Promise\<{ allowed: boolean; remaining: number }\> { |
|   |
|   const org \= await prisma.organization.findUnique({ |
|     where: { id: organizationId }, |
|     select: { aiQuota: true, aiUsed: true, plan: true } |
|   }) |
|   |
|   if (\!org) throw new Error('Organization not found') |
|   |
|   // AGENCY and ENTERPRISE plans have unlimited quota |
|   if (org.plan \!== 'PERSONAL') return { allowed: true, remaining: Infinity } |
|   |
|   if (org.aiUsed \>= org.aiQuota) { |
|     return { allowed: false, remaining: 0 } |
|   } |
|   |
|   await prisma.organization.update({ |
|     where: { id: organizationId }, |
|     data: { aiUsed: { increment: estimatedTokens } } |
|   }) |
|   |
|   return { allowed: true, remaining: org.aiQuota \- org.aiUsed \- estimatedTokens } |
| } |

# **16\. 開發者本機設定  Developer Setup**

## **16.1 Prerequisites**

* Node.js 22 LTS

* pnpm 9.x（npm i \-g pnpm）

* Docker \+ Docker Compose（本機 PostgreSQL \+ Redis）

* Doppler CLI（secrets 管理）

* Vercel CLI（preview deploy）

## **16.2 快速啟動**

| *bash* |
| :---- |
| \# 1\. Clone & install |
| git clone https://github.com/sincerely-ai/platform.git |
| cd platform |
| pnpm install |
|   |
| \# 2\. Start local services |
| docker compose up \-d   \# PostgreSQL 5432, Redis 6379 |
|   |
| \# 3\. Setup environment |
| cp .env.example .env.local |
| \# 填入必要的 API keys |
|   |
| \# 4\. Database setup |
| pnpm db:migrate          \# prisma migrate dev |
| pnpm db:seed             \# 建立測試帳號與範例資料 |
|   |
| \# 5\. Start dev server |
| pnpm dev                 \# turborepo 同時啟動所有 apps |
|   |
| \# Web: http://localhost:3000 |
| \# Admin: http://localhost:3001 |
| \# Prisma Studio: pnpm db:studio (http://localhost:5555) |
|   |
| \# 6\. Run tests |
| pnpm test                \# unit \+ integration |
| pnpm test:e2e            \# Playwright (需先啟動 dev server) |
|   |
| \# 7\. Run AI evals |
| pnpm eval:spin           \# SPIN prompt evaluation |

## **16.3 Seed 資料說明**

| *bash* |
| :---- |
| \# packages/db/seed.ts 建立以下測試資料: |
| \# Organization: 測試通訊處 (AGENCY plan) |
| \#   User: owner@test.com / password123 (OWNER) |
| \#   User: manager@test.com / password123 (MANAGER) |
| \#   User: agent@test.com / password123 (AGENT) |
| \#   Clients: 10 筆範例客戶（含家庭結構、現有保障） |
| \#   SpinSessions: 3 筆已完成對話 |
| \#   Reports: 5 筆範例報告（含分享連結） |
| \#   KnowledgeDocs: 台灣壽險基礎知識 PDF（已索引） |

# **17\. 參考文獻  References**

本規格文件技術選型與架構設計引用以下學術論文、技術文件與行業標準：

**\[1\]**  Fowler, M., & Rice, D.. *"Patterns of Enterprise Application Architecture."* Addison-Wesley, 2002\.

**\[2\]**  OWASP Foundation. *"Session Management Cheat Sheet."* OWASP Cheat Sheet Series, 2024\.  https://cheatsheetseries.owasp.org/cheatsheets/Session\_Management\_Cheat\_Sheet.html

**\[3\]**  Vercel. *"AI SDK Documentation."* Vercel Developer Platform, 2024\.  https://sdk.vercel.ai/docs

**\[4\]**  OpenAI. *"Best Practices for Streaming Completions."* OpenAI Platform Documentation, 2024\.  https://platform.openai.com/docs/guides/streaming

**\[5\]**  Rackham, N.. *"SPIN Selling."* McGraw-Hill, 1988\.

**\[6\]**  Schulhoff, S. et al.. *"The Prompt Report: A Systematic Survey of Prompting Techniques."* arXiv:2406.06608, 2024\.  https://arxiv.org/abs/2406.06608

**\[7\]**  Park, J. S. et al.. *"Generative Agents: Interactive Simulacra of Human Behavior."* Proc. UIST 2023, 2023\.  https://arxiv.org/abs/2304.03442

**\[8\]**  Gawande, A.. *"The Checklist Manifesto: How to Get Things Right."* Metropolitan Books, 2009\.

**\[9\]**  Lewis, P. et al.. *"Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks."* NeurIPS 2020, 2020\.  https://arxiv.org/abs/2005.11401

**\[10\]**  Guu, K. et al.. *"REALM: Retrieval-Augmented Language Model Pre-Training."* ICML 2020, 2020\.  https://arxiv.org/abs/2002.08909

**\[11\]**  Yao, S. et al.. *"ReAct: Synergizing Reasoning and Acting in Language Models."* ICLR 2023, 2023\.  https://arxiv.org/abs/2210.03629

**\[12\]**  OWASP Foundation. *"OWASP Top 10: 2021 Edition."* OWASP, 2021\.  https://owasp.org/Top10/

**\[13\]**  Dodds, K. C.. *"Write tests. Not too many. Mostly integration.."* kentcdodds.com, 2018\.  https://kentcdodds.com/blog/write-tests

**\[14\]**  Shankar, S. et al.. *"Who Validates the Validators? Aligning LLM-Assisted Evaluation of LLM Outputs."* arXiv:2404.09494, 2024\.  https://arxiv.org/abs/2404.09494

**\[15\]**  Stripe. *"SaaS Subscription Integration Guide."* Stripe Documentation, 2024\.  https://stripe.com/docs/billing/subscriptions/overview

**\[16\]**  Pinecone. *"Hybrid Search: Combining Dense and Sparse Vectors."* Pinecone Learning Center, 2024\.  https://www.pinecone.io/learn/hybrid-search-intro/

**\[17\]**  Anthropic. *"Claude API Documentation."* Anthropic Developer Docs, 2024\.  https://docs.anthropic.com

**\[18\]**  ElevenLabs. *"Text to Speech API Reference."* ElevenLabs Documentation, 2024\.  https://elevenlabs.io/docs

**\[19\]**  금관위 (Taiwan FSC). *"金融機構辦理業務電腦化安全控管原則."* 台灣金融監督管理委員會, 2023\.

**\[20\]**  OpenAI. *"Whisper Technical Report."* OpenAI, 2022\.  https://arxiv.org/abs/2212.04356

*— End of Document —*

誠問 AI Technical Specification v1.0  |  2026-04  |  CONFIDENTIAL