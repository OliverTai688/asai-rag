import { existsSync, readFileSync } from "node:fs";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { Pool } from "pg";

loadEnvFile(".env");

const scrypt = promisify(scryptCallback);

// Demo password login passwords — kept in sync with src/lib/demo-login.ts so the
// standard "帳號密碼" provider (scrypt verifyPassword) works for demo accounts.
const demoPasswordByEmail = {
  "demo.member@asai.local": "AsaiDemo-Member-2026!",
  "demo.manager@asai.local": "AsaiDemo-Manager-2026!",
  "demo.collaborator@asai.local": "AsaiDemo-Collab-2026!",
};

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

const scenario = "quickstart-insurance-advisor";
const version = 1;

const ids = {
  org: "demo_org_asai_personal",
  headquarters: "demo_unit_hq",
  branch: "demo_unit_branch_taipei",
  memberUser: "demo_user_member",
  managerUser: "demo_user_manager",
  collaboratorUser: "demo_user_collaborator",
  clientUser: "demo_user_client",
  memberMembership: "demo_membership_member",
  managerMembership: "demo_membership_manager",
  collaboratorMembership: "demo_membership_collaborator",
  client: "c_wang",
  spouse: "demo_family_wang_spouse",
  child: "demo_family_wang_child",
  termLifePolicy: "demo_policy_wang_term_life",
  medicalPolicy: "demo_policy_wang_medical",
  compliance: "demo_compliance_wang",
  visitPlan: "demo_visit_wang_add_on",
  spinSession: "demo_spin_wang_gap",
  spinMessageUser: "demo_spin_msg_wang_user_001",
  spinMessageAssistant: "demo_spin_msg_wang_assistant_001",
  theaterSession: "demo_theater_wang_conservative",
  theaterTurnAgent: "demo_theater_turn_agent_001",
  theaterTurnClient: "demo_theater_turn_client_001",
  report: "demo_report_wang_gap",
  reportShare: "demo_share_wang_gap",
};

// 焦點 demo 客戶（王大明）以外的補充客戶名單。
// 每位都帶完整家庭、現有保單、合規狀態與「給 AI 了解客戶 / 劇場演練」的背景筆記，
// 讓客戶管理頁是一份乾淨、可演練的真實情境集合。
const demoRoster = [
  {
    slug: "lin",
    name: "林建華",
    email: "ch.lin@email.com",
    phone: "0922-111-222",
    birthDate: "1972-11-25",
    occupation: "中小企業主",
    annualIncome: 5000000,
    status: "ACTIVE",
    sensitivity: "NORMAL",
    tags: ["保守型", "退休規劃"],
    aiTags: ["遺產稅問題", "長期照護缺口"],
    lastInteraction: "2026-04-18T15:30:00Z",
    persona: "CONSERVATIVE",
    notes:
      "中小企業主，年收約 500 萬，配偶張麗華。已有南山終身壽險 1000 萬。重視資產傳承與稅務，決策謹慎、需要數據與試算佐證。待釐清：遺產稅試算、長照規劃、企業與個人資產分流。｜劇場人格：保守謹慎型，問句要先給依據再給建議。",
    family: [{ relation: "配偶", name: "張麗華", age: 50 }],
    policies: [{ type: "終身壽險", amount: 10000000, provider: "南山人壽" }],
    compliance: {
      kyc: "COMPLETE",
      suitability: "PARTIAL",
      consent: "COMPLETE",
      missingItems: ["長期照護需求評估"],
      financialInfo: { annualIncome: 5000000, dependents: 1 },
      riskProfile: { appetite: "conservative", horizonYears: 15 },
    },
  },
  {
    slug: "chen",
    name: "陳雅婷",
    email: "yating.chen@email.com",
    phone: "0933-999-888",
    birthDate: "1994-07-08",
    occupation: "自由設計師",
    annualIncome: 900000,
    status: "PROSPECT",
    sensitivity: "NORMAL",
    tags: ["疑慮型", "單身"],
    aiTags: ["意外險建議", "實支實付醫療"],
    lastInteraction: "2026-05-10T14:00:00Z",
    persona: "SKEPTICAL",
    notes:
      "28 歲自由設計師，收入波動、單身且目前無任何保障。對保險業務有戒心，習慣自己上網查資料、怕被推銷。待釐清：意外與實支實付需求、可負擔的預算彈性、信任建立。｜劇場人格：質疑挑戰型，會反問「為什麼需要」。",
    family: [],
    policies: [],
    compliance: {
      kyc: "PARTIAL",
      suitability: "MISSING",
      consent: "MISSING",
      missingItems: ["收入與預算確認", "風險屬性問卷", "資料蒐集同意"],
      financialInfo: { annualIncome: 900000, dependents: 0 },
      riskProfile: { appetite: "unknown", horizonYears: null },
    },
  },
  {
    slug: "lee",
    name: "李國樑",
    email: "gl.lee@email.com",
    phone: "0988-777-666",
    birthDate: "1980-01-30",
    occupation: "公務員",
    annualIncome: 1200000,
    status: "ACTIVE",
    sensitivity: "NORMAL",
    tags: ["穩健型", "教育基金"],
    aiTags: ["重大傷病缺口"],
    lastInteraction: "2026-04-15T14:00:00Z",
    persona: "CONSERVATIVE",
    notes:
      "公務員，收入穩定，配偶黃芳芬與 12 歲兒子。已有新光防癌險 100 萬。重視子女教育金與重大傷病缺口，穩健、按部就班。待釐清：教育金試算、重大傷病一次金額度。｜劇場人格：保守穩健型，喜歡循序漸進。",
    family: [
      { relation: "配偶", name: "黃芳芬", age: 44 },
      { relation: "子", name: "李小寶", age: 12 },
    ],
    policies: [{ type: "防癌險", amount: 1000000, provider: "新光人壽" }],
    compliance: {
      kyc: "COMPLETE",
      suitability: "PARTIAL",
      consent: "COMPLETE",
      missingItems: ["子女教育金缺口確認"],
      financialInfo: { annualIncome: 1200000, dependents: 2 },
      riskProfile: { appetite: "balanced", horizonYears: 18 },
    },
  },
  {
    slug: "wu",
    name: "吳美玲",
    email: "meiling.wu@email.com",
    phone: "0977-555-444",
    birthDate: "1965-05-15",
    occupation: "退休教師",
    annualIncome: 800000,
    status: "ACTIVE",
    sensitivity: "NORMAL",
    tags: ["安養規劃", "長照關注"],
    aiTags: ["失能保障強化"],
    lastInteraction: "2026-04-10T11:20:00Z",
    persona: "EMOTIONAL",
    notes:
      "退休教師，獨居，已有三商美邦養老險 200 萬。關注長照與失能，談到健康與孤老議題時情緒較重、需要被理解。待釐清：失能扶助金、長照月給付、醫療自費缺口。｜劇場人格：情感型，先同理再談保障。",
    family: [],
    policies: [{ type: "養老險", amount: 2000000, provider: "三商美邦" }],
    compliance: {
      kyc: "COMPLETE",
      suitability: "PARTIAL",
      consent: "COMPLETE",
      missingItems: ["長照與失能需求評估"],
      financialInfo: { annualIncome: 800000, dependents: 0 },
      riskProfile: { appetite: "conservative", horizonYears: 10 },
    },
  },
  {
    slug: "chang",
    name: "張志明",
    email: "cm.chang@email.com",
    phone: "0966-333-222",
    birthDate: "1998-10-12",
    occupation: "外送員",
    annualIncome: 500000,
    status: "PROSPECT",
    sensitivity: "NORMAL",
    tags: ["高風險業", "預算受限"],
    aiTags: ["意外險急需", "簡易醫療保障"],
    lastInteraction: "2026-05-12T09:00:00Z",
    persona: "BUSY",
    notes:
      "外送員，高風險職業、預算有限，時間零碎、講求效率，目前完全無保障。待釐清：意外險急迫性、最低保費的基本醫療。｜劇場人格：忙碌沒耐心型，要先講重點與保費。",
    family: [],
    policies: [],
    compliance: {
      kyc: "PARTIAL",
      suitability: "MISSING",
      consent: "PARTIAL",
      missingItems: ["職業風險等級確認", "預算上限確認", "風險屬性問卷"],
      financialInfo: { annualIncome: 500000, dependents: 0 },
      riskProfile: { appetite: "unknown", horizonYears: null },
    },
  },
  {
    slug: "huang",
    name: "黃曉燕",
    email: "hy.huang@email.com",
    phone: "0955-111-000",
    birthDate: "1988-12-01",
    occupation: "銀行行員",
    annualIncome: 1100000,
    status: "ACTIVE",
    sensitivity: "NORMAL",
    tags: ["孝親需求", "理財導向"],
    aiTags: ["長輩醫療負擔分析"],
    lastInteraction: "2026-04-21T13:30:00Z",
    persona: "EMOTIONAL",
    notes:
      "銀行行員，需照顧 70 歲父親，理財導向、懂金融商品，已有安聯投資型保單 300 萬。在意長輩醫療負擔與自身退休規劃。待釐清：長輩醫療分攤、投資型保單檢視與費用結構。｜劇場人格：情感型但理性，孝親議題情緒重。",
    family: [{ relation: "父", name: "黃老伯", age: 70 }],
    policies: [{ type: "投資型保單", amount: 3000000, provider: "安聯人壽" }],
    compliance: {
      kyc: "COMPLETE",
      suitability: "PARTIAL",
      consent: "COMPLETE",
      missingItems: ["投資型保單適合度複核"],
      financialInfo: { annualIncome: 1100000, dependents: 1 },
      riskProfile: { appetite: "growth", horizonYears: 20 },
    },
  },
  {
    slug: "chu",
    name: "朱大山",
    email: "ts.chu@email.com",
    phone: "0944-888-777",
    birthDate: "1978-02-14",
    occupation: "大車司機",
    annualIncome: 1500000,
    status: "PROSPECT",
    sensitivity: "NORMAL",
    tags: ["高壓職業", "遲疑型"],
    aiTags: ["家庭支柱失能風險"],
    lastInteraction: "2026-04-19T17:10:00Z",
    persona: "SKEPTICAL",
    notes:
      "大車司機，高壓高風險職業、家庭經濟支柱，配偶沈小姐無業，目前無任何保單。對保險半信半疑、怕被推銷。待釐清：失能與壽險保障、家庭收入替代規劃。｜劇場人格：遲疑質疑型，需要先建立信任。",
    family: [{ relation: "配偶", name: "沈小姐", age: 40 }],
    policies: [],
    compliance: {
      kyc: "PARTIAL",
      suitability: "MISSING",
      consent: "MISSING",
      missingItems: ["家庭收支盤點", "職業風險評估", "資料蒐集同意"],
      financialInfo: { annualIncome: 1500000, dependents: 1 },
      riskProfile: { appetite: "unknown", horizonYears: null },
    },
  },
  {
    slug: "tsai",
    name: "蔡佩芬",
    email: "pf.tsai@email.com",
    phone: "0999-000-111",
    birthDate: "1991-09-30",
    occupation: "護理師",
    annualIncome: 1300000,
    status: "ACTIVE",
    sensitivity: "NORMAL",
    tags: ["醫療背景", "高保障要求"],
    aiTags: ["重大疾病一次金加強"],
    lastInteraction: "2026-05-14T08:00:00Z",
    persona: "SKEPTICAL",
    notes:
      "護理師，醫療專業、懂行且對保障要求高，已有台灣人壽實支實付。會挑剔條款細節與理賠範圍。待釐清：重大疾病一次金、實支實付額度上限與雜費。｜劇場人格：專業挑剔型，會追問條款細節。",
    family: [],
    policies: [{ type: "實支實付", amount: 150000, provider: "台灣人壽" }],
    compliance: {
      kyc: "COMPLETE",
      suitability: "PARTIAL",
      consent: "COMPLETE",
      missingItems: ["重大疾病保障缺口確認"],
      financialInfo: { annualIncome: 1300000, dependents: 0 },
      riskProfile: { appetite: "balanced", horizonYears: 25 },
    },
  },
  {
    slug: "lo",
    name: "羅德華",
    email: "th.lo@email.com",
    phone: "0900-222-333",
    birthDate: "1982-06-21",
    occupation: "餐廳老闆",
    annualIncome: 2500000,
    status: "PROSPECT",
    sensitivity: "NORMAL",
    tags: ["創業者", "資產傳承"],
    aiTags: ["企業關鍵人保險", "子女教育金規劃"],
    lastInteraction: "2026-04-17T11:45:00Z",
    persona: "BUSY",
    notes:
      "餐廳老闆，年收約 250 萬，配偶與兩名子女（10 歲、7 歲），創業忙碌、以現金流為重，目前無保單。待釐清：企業關鍵人保險、子女教育金、稅務與傳承。｜劇場人格：忙碌務實型，重視投報與時間成本。",
    family: [
      { relation: "配偶", name: "王太太", age: 40 },
      { relation: "子", name: "羅小弟", age: 10 },
      { relation: "子", name: "羅小二", age: 7 },
    ],
    policies: [],
    compliance: {
      kyc: "PARTIAL",
      suitability: "MISSING",
      consent: "PARTIAL",
      missingItems: ["企業與個人資產分流", "子女教育金試算", "風險屬性問卷"],
      financialInfo: { annualIncome: 2500000, dependents: 3 },
      riskProfile: { appetite: "unknown", horizonYears: null },
    },
  },
];

// 通訊處主管自己的客戶名單（主管同時也是有個人業績的顧問）。
// 這些客戶 owner 為主管本人，只會出現在主管自己的 owner-scoped CRM / 顧問陪談 / 劇場演練；
// 不會因此讓主管看到其他成員的客戶明細（org 彙總 API 仍只給統計）。
// 名字與業務員名單刻意不重複，避免混淆。
const managerRoster = [
  {
    slug: "mgr_zhou",
    name: "周文昌",
    email: "wc.chou@email.com",
    phone: "0911-200-300",
    birthDate: "1968-08-09",
    occupation: "上市公司高階經理人",
    annualIncome: 6000000,
    status: "ACTIVE",
    sensitivity: "NORMAL",
    tags: ["高資產", "資產傳承"],
    aiTags: ["遺產稅試算", "高額壽險規劃"],
    lastInteraction: "2026-05-09T10:30:00Z",
    persona: "CONSERVATIVE",
    notes:
      "上市公司高階經理人，年收約 600 萬，配偶與一名留學中的女兒。已有國泰高額終身壽險 3000 萬。在意稅務效率與資產傳承，理性、看重專業度與長期關係。待釐清：遺產稅試算、信託需求、二代承接規劃。｜劇場人格：保守謹慎型，重視顧問的專業與信任。",
    family: [
      { relation: "配偶", name: "周太太", age: 54 },
      { relation: "女", name: "周以柔", age: 22 },
    ],
    policies: [{ type: "終身壽險", amount: 30000000, provider: "國泰人壽" }],
    compliance: {
      kyc: "COMPLETE",
      suitability: "PARTIAL",
      consent: "COMPLETE",
      missingItems: ["資產傳承與信託需求評估"],
      financialInfo: { annualIncome: 6000000, dependents: 2 },
      riskProfile: { appetite: "conservative", horizonYears: 20 },
    },
  },
  {
    slug: "mgr_zheng",
    name: "鄭淑芬",
    email: "sf.cheng@email.com",
    phone: "0922-400-500",
    birthDate: "1983-04-17",
    occupation: "二度就業行政人員",
    annualIncome: 700000,
    status: "ACTIVE",
    sensitivity: "NORMAL",
    tags: ["雙薪家庭", "子女教育"],
    aiTags: ["子女教育金缺口", "婦女保障"],
    lastInteraction: "2026-05-06T16:00:00Z",
    persona: "EMOTIONAL",
    notes:
      "二度就業的行政人員，配偶為工程師，育有兩名國小子女。已有富邦實支實付。重視子女教育金與家庭保障，談到孩子時投入、決策受先生影響。待釐清：教育金試算、婦女與重大疾病保障、家庭保費預算。｜劇場人格：情感型，孩子相關議題容易打動。",
    family: [
      { relation: "配偶", name: "鄭先生", age: 41 },
      { relation: "子", name: "鄭小寶", age: 9 },
      { relation: "女", name: "鄭小妹", age: 6 },
    ],
    policies: [{ type: "實支實付", amount: 120000, provider: "富邦人壽" }],
    compliance: {
      kyc: "COMPLETE",
      suitability: "PARTIAL",
      consent: "COMPLETE",
      missingItems: ["子女教育金缺口確認"],
      financialInfo: { annualIncome: 700000, dependents: 3 },
      riskProfile: { appetite: "balanced", horizonYears: 15 },
    },
  },
  {
    slug: "mgr_gao",
    name: "高俊傑",
    email: "cj.kao@email.com",
    phone: "0933-600-700",
    birthDate: "1990-12-22",
    occupation: "新創公司創辦人",
    annualIncome: 3200000,
    status: "PROSPECT",
    sensitivity: "NORMAL",
    tags: ["新創", "高成長"],
    aiTags: ["關鍵人保險", "現金流彈性"],
    lastInteraction: "2026-05-08T11:15:00Z",
    persona: "BUSY",
    notes:
      "新創公司創辦人，年收波動大、時間極度有限，目前無個人保單。重視彈性與效率，習慣快速決策、討厭冗長說明。待釐清：關鍵人保險、收入中斷保障、可調整的彈性保費規劃。｜劇場人格：忙碌沒耐心型，要先給結論再補細節。",
    family: [],
    policies: [],
    compliance: {
      kyc: "PARTIAL",
      suitability: "MISSING",
      consent: "PARTIAL",
      missingItems: ["收入結構盤點", "關鍵人需求評估", "風險屬性問卷"],
      financialInfo: { annualIncome: 3200000, dependents: 0 },
      riskProfile: { appetite: "growth", horizonYears: 10 },
    },
  },
];

const planConfigs = [
  {
    id: "demo_plan_free",
    plan: "FREE",
    displayName: "Free",
    maxMembers: 1,
    maxCollaborators: 0,
    maxUnits: 1,
    monthlyAiQuota: 10,
    shareBrandingEnabled: false,
    clientPortalEnabled: false,
    impersonationAllowed: true,
  },
  {
    id: "demo_plan_starter",
    plan: "STARTER",
    displayName: "Starter",
    maxMembers: 1,
    maxCollaborators: 2,
    maxUnits: 1,
    monthlyAiQuota: 200,
    shareBrandingEnabled: false,
    clientPortalEnabled: false,
    impersonationAllowed: true,
  },
  {
    id: "demo_plan_pro",
    plan: "PRO",
    displayName: "Pro",
    maxMembers: 20,
    maxCollaborators: 5,
    maxUnits: 1,
    monthlyAiQuota: 1000,
    shareBrandingEnabled: true,
    clientPortalEnabled: true,
    impersonationAllowed: true,
  },
  {
    id: "demo_plan_enterprise",
    plan: "ENTERPRISE",
    displayName: "Enterprise",
    maxMembers: 500,
    maxCollaborators: 25,
    maxUnits: 100,
    monthlyAiQuota: 10000,
    shareBrandingEnabled: true,
    clientPortalEnabled: true,
    impersonationAllowed: true,
  },
];

const users = [
  {
    id: ids.memberUser,
    email: "demo.member@asai.local",
    name: "Demo 業務員",
    seedKey: "user:member",
  },
  {
    id: ids.managerUser,
    email: "demo.manager@asai.local",
    name: "Demo 主管",
    seedKey: "user:manager",
  },
  {
    id: ids.collaboratorUser,
    email: "demo.collaborator@asai.local",
    name: "Demo 協作者",
    seedKey: "user:collaborator",
  },
  {
    id: ids.clientUser,
    email: "demo.client@asai.local",
    name: "Demo 客戶",
    seedKey: "user:client",
  },
];

const pool = new Pool({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

async function main() {
  const shouldReset = process.argv.includes("--reset");

  if (!pool.options.connectionString) {
    throw new Error("Missing DIRECT_URL or DATABASE_URL for demo seed.");
  }

  let client;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    if (shouldReset) {
      await resetScenario(client);
    }

    await upsertPlanConfigs(client);
    await upsertUsers(client);
    await upsertOrganization(client);
    await upsertUnits(client);
    await upsertMemberships(client);
    await cleanupQaTestClients(client);
    await upsertClientScenario(client);
    await upsertRosterClients(client);
    await upsertVisitPlan(client);
    await upsertSpinScenario(client);
    await upsertTheaterScenario(client);
    await upsertReportScenario(client);

    await client.query("COMMIT");
    console.log(`Seeded demo scenario "${scenario}" v${version}.`);
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK").catch(() => undefined);
    }
    printConnectionHint(error);
    throw error;
  } finally {
    client?.release();
    await pool.end();
  }
}

async function resetScenario(client) {
  const params = [scenario];
  await client.query(
    `DELETE FROM share_events
     WHERE share_id IN (SELECT id FROM report_shares WHERE demo_scenario = $1)`,
    params,
  );
  await client.query("DELETE FROM report_shares WHERE demo_scenario = $1", params);
  await client.query("DELETE FROM reports WHERE demo_scenario = $1", params);
  await client.query(
    `DELETE FROM theater_turns
     WHERE session_id IN (SELECT id FROM theater_sessions WHERE demo_scenario = $1)`,
    params,
  );
  await client.query("DELETE FROM theater_sessions WHERE demo_scenario = $1", params);
  await client.query(
    `DELETE FROM spin_messages
     WHERE session_id IN (SELECT id FROM spin_sessions WHERE demo_scenario = $1)`,
    params,
  );
  await client.query("DELETE FROM spin_sessions WHERE demo_scenario = $1", params);
  await client.query("DELETE FROM visit_plans WHERE demo_scenario = $1", params);
  await client.query(
    `DELETE FROM compliance_checklists
     WHERE client_id IN (SELECT id FROM clients WHERE demo_scenario = $1)`,
    params,
  );
  await client.query(
    `DELETE FROM policies
     WHERE client_id IN (SELECT id FROM clients WHERE demo_scenario = $1)`,
    params,
  );
  await client.query(
    `DELETE FROM family_members
     WHERE client_id IN (SELECT id FROM clients WHERE demo_scenario = $1)`,
    params,
  );
  await client.query("DELETE FROM clients WHERE demo_scenario = $1", params);
  await client.query("DELETE FROM organization_members WHERE organization_id IN (SELECT id FROM organizations WHERE demo_scenario = $1)", params);
  await client.query("DELETE FROM organization_units WHERE demo_scenario = $1", params);
  await client.query("DELETE FROM organizations WHERE demo_scenario = $1", params);
  await client.query("DELETE FROM users WHERE demo_scenario = $1", params);
}

async function upsertPlanConfigs(client) {
  for (const config of planConfigs) {
    await client.query(
      `INSERT INTO plan_configs (
        id,
        plan,
        display_name,
        max_members,
        max_collaborators,
        max_units,
        monthly_ai_quota,
        share_branding_enabled,
        client_portal_enabled,
        impersonation_allowed,
        is_active,
        metadata,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        $2::"OrganizationPlan",
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        true,
        $11::jsonb,
        now(),
        now()
      )
      ON CONFLICT (plan) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        max_members = EXCLUDED.max_members,
        max_collaborators = EXCLUDED.max_collaborators,
        max_units = EXCLUDED.max_units,
        monthly_ai_quota = EXCLUDED.monthly_ai_quota,
        share_branding_enabled = EXCLUDED.share_branding_enabled,
        client_portal_enabled = EXCLUDED.client_portal_enabled,
        impersonation_allowed = EXCLUDED.impersonation_allowed,
        is_active = true,
        metadata = EXCLUDED.metadata,
        updated_at = now()`,
      [
        config.id,
        config.plan,
        config.displayName,
        config.maxMembers,
        config.maxCollaborators,
        config.maxUnits,
        config.monthlyAiQuota,
        config.shareBrandingEnabled,
        config.clientPortalEnabled,
        config.impersonationAllowed,
        json({ source: "scripts/seed-demo.mjs", scenario, version }),
      ],
    );
  }
}

async function upsertUsers(client) {
  for (const user of users) {
    const plainPassword = demoPasswordByEmail[user.email];
    const passwordHash = plainPassword ? await hashPassword(plainPassword) : null;

    await client.query(
      `INSERT INTO users (
        id,
        email,
        name,
        status,
        password_hash,
        is_demo,
        demo_seed_key,
        demo_scenario,
        demo_seed_version,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, 'ACTIVE'::"UserStatus", $4, true, $5, $6, $7, now(), now())
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        status = 'ACTIVE'::"UserStatus",
        password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash),
        is_demo = true,
        demo_seed_key = EXCLUDED.demo_seed_key,
        demo_scenario = EXCLUDED.demo_scenario,
        demo_seed_version = EXCLUDED.demo_seed_version,
        updated_at = now()`,
      [user.id, user.email, user.name, passwordHash, seed(user.seedKey), scenario, version],
    );
  }
}

async function upsertOrganization(client) {
  await client.query(
    `INSERT INTO organizations (
      id,
      name,
      slug,
      plan,
      status,
      logo_url,
      brand_color,
      settings,
      seat_limit,
      monthly_ai_quota,
      monthly_ai_used,
      is_demo,
      demo_seed_key,
      demo_scenario,
      demo_seed_version,
      demo_data_seeded_at,
      trial_starts_at,
      trial_ends_at,
      created_at,
      updated_at
    )
    VALUES (
      $1,
      '誠問 AI Demo 個人工作區',
      'demo-asai-personal',
      'STARTER'::"OrganizationPlan",
      'ACTIVE'::"OrganizationStatus",
      null,
      '#1A3A6B',
      $2::jsonb,
      3,
      200,
      0,
      true,
      $3,
      $4,
      $5,
      now(),
      now(),
      now() + interval '14 days',
      now(),
      now()
    )
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      plan = EXCLUDED.plan,
      status = EXCLUDED.status,
      brand_color = EXCLUDED.brand_color,
      settings = EXCLUDED.settings,
      seat_limit = EXCLUDED.seat_limit,
      monthly_ai_quota = EXCLUDED.monthly_ai_quota,
      is_demo = true,
      demo_seed_key = EXCLUDED.demo_seed_key,
      demo_scenario = EXCLUDED.demo_scenario,
      demo_seed_version = EXCLUDED.demo_seed_version,
      demo_data_seeded_at = now(),
      updated_at = now()`,
    [
      ids.org,
      json({ demoAccounts: users.map((user) => user.email), scenario, version }),
      seed("org:personal"),
      scenario,
      version,
    ],
  );
}

async function upsertUnits(client) {
  const units = [
    {
      id: ids.headquarters,
      parentId: null,
      type: "HEADQUARTERS",
      name: "Demo 總公司",
      slug: "demo-hq",
      seedKey: "unit:hq",
    },
    {
      id: ids.branch,
      parentId: ids.headquarters,
      type: "BRANCH",
      name: "Demo 台北通訊處",
      slug: "demo-taipei-branch",
      seedKey: "unit:taipei-branch",
    },
  ];

  for (const unit of units) {
    await client.query(
      `INSERT INTO organization_units (
        id,
        organization_id,
        parent_id,
        type,
        name,
        slug,
        brand_color,
        settings,
        is_active,
        is_demo,
        demo_seed_key,
        demo_scenario,
        demo_seed_version,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4::"OrganizationUnitType",
        $5,
        $6,
        '#1A3A6B',
        $7::jsonb,
        true,
        true,
        $8,
        $9,
        $10,
        now(),
        now()
      )
      ON CONFLICT (demo_seed_key) DO UPDATE SET
        parent_id = EXCLUDED.parent_id,
        type = EXCLUDED.type,
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        brand_color = EXCLUDED.brand_color,
        settings = EXCLUDED.settings,
        is_active = true,
        demo_scenario = EXCLUDED.demo_scenario,
        demo_seed_version = EXCLUDED.demo_seed_version,
        updated_at = now()`,
      [
        unit.id,
        ids.org,
        unit.parentId,
        unit.type,
        unit.name,
        unit.slug,
        json({ scenario, version }),
        seed(unit.seedKey),
        scenario,
        version,
      ],
    );
  }
}

async function upsertMemberships(client) {
  const memberships = [
    {
      id: ids.managerMembership,
      userId: ids.managerUser,
      role: "MANAGER",
      title: "Demo 通訊處主管",
    },
    {
      id: ids.memberMembership,
      userId: ids.memberUser,
      role: "MEMBER",
      title: "Demo 保險顧問",
    },
    {
      id: ids.collaboratorMembership,
      userId: ids.collaboratorUser,
      role: "COLLABORATOR",
      title: "Demo 協作者",
    },
  ];

  for (const membership of memberships) {
    await client.query(
      `INSERT INTO organization_members (
        id,
        organization_id,
        user_id,
        primary_unit_id,
        role,
        status,
        region,
        title,
        is_default,
        accepted_at,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5::"MemberRole",
        'ACTIVE'::"MembershipStatus",
        '台北',
        $6,
        true,
        now(),
        now(),
        now()
      )
      ON CONFLICT (organization_id, user_id) DO UPDATE SET
        primary_unit_id = EXCLUDED.primary_unit_id,
        role = EXCLUDED.role,
        status = 'ACTIVE'::"MembershipStatus",
        region = EXCLUDED.region,
        title = EXCLUDED.title,
        is_default = true,
        accepted_at = now(),
        updated_at = now()`,
      [membership.id, ids.org, membership.userId, ids.branch, membership.role, membership.title],
    );
  }
}

async function upsertClientScenario(client) {
  await client.query(
    `INSERT INTO clients (
      id,
      organization_id,
      unit_id,
      owner_id,
      name,
      email,
      phone,
      birth_date,
      occupation,
      annual_income,
      status,
      sensitivity,
      tags,
      ai_tags,
      notes,
      source,
      is_demo,
      demo_seed_key,
      demo_scenario,
      demo_seed_version,
      last_interaction_at,
      created_at,
      updated_at
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      '王大明',
      'ta-ming.wang@email.com',
      '0912-345-678',
      '1985-03-12',
      '科技業中階主管',
      1800000,
      'ACTIVE'::"ClientStatus",
      'NORMAL'::"ClientSensitivity",
      $5::text[],
      $6::text[],
      '科技業中階主管，雙薪家庭，配偶林小美與兩名子女（8 歲、5 歲）。已有國泰定期壽險 500 萬與富邦住院醫療。高意向、理性溝通，願意看數據。待釐清：子女教育金缺口、醫療險額度不足、家庭保障總檢視。｜劇場人格：理性高意向型，喜歡清楚的選項比較。',
      'demo_seed',
      true,
      $7,
      $8,
      $9,
      '2026-05-13T10:00:00Z',
      now(),
      now()
    )
    ON CONFLICT (demo_seed_key) DO UPDATE SET
      unit_id = EXCLUDED.unit_id,
      owner_id = EXCLUDED.owner_id,
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      birth_date = EXCLUDED.birth_date,
      occupation = EXCLUDED.occupation,
      annual_income = EXCLUDED.annual_income,
      status = EXCLUDED.status,
      sensitivity = EXCLUDED.sensitivity,
      tags = EXCLUDED.tags,
      ai_tags = EXCLUDED.ai_tags,
      notes = EXCLUDED.notes,
      source = EXCLUDED.source,
      is_demo = true,
      demo_scenario = EXCLUDED.demo_scenario,
      demo_seed_version = EXCLUDED.demo_seed_version,
      last_interaction_at = EXCLUDED.last_interaction_at,
      updated_at = now()`,
    [
      ids.client,
      ids.org,
      ids.branch,
      ids.memberUser,
      ["高意向", "雙薪家庭"],
      ["子女教育金缺口", "醫療險不足"],
      seed("client:wang"),
      scenario,
      version,
    ],
  );

  await upsertFamilyMember(client, {
    id: ids.spouse,
    relation: "配偶",
    name: "林小美",
    age: 38,
  });
  await upsertFamilyMember(client, {
    id: ids.child,
    relation: "子",
    name: "王小明",
    age: 8,
  });
  await upsertPolicy(client, {
    id: ids.termLifePolicy,
    type: "定期壽險",
    amount: 5000000,
    provider: "國泰人壽",
  });
  await upsertPolicy(client, {
    id: ids.medicalPolicy,
    type: "住院醫療",
    amount: 2000,
    provider: "富邦人壽",
  });
  await upsertComplianceChecklist(client);
}

async function upsertFamilyMember(client, member) {
  await client.query(
    `INSERT INTO family_members (id, client_id, name, relation, age, metadata, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, now(), now())
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       relation = EXCLUDED.relation,
       age = EXCLUDED.age,
       metadata = EXCLUDED.metadata,
       updated_at = now()`,
    [member.id, ids.client, member.name, member.relation, member.age, json({ scenario, version })],
  );
}

async function upsertPolicy(client, policy) {
  await client.query(
    `INSERT INTO policies (
       id,
       client_id,
       category,
       product_name,
       provider,
       insured_amount,
       status,
       metadata,
       created_at,
       updated_at
     )
     VALUES ($1, $2, $3, $3, $4, $5, 'ACTIVE'::"PolicyStatus", $6::jsonb, now(), now())
     ON CONFLICT (id) DO UPDATE SET
       category = EXCLUDED.category,
       product_name = EXCLUDED.product_name,
       provider = EXCLUDED.provider,
       insured_amount = EXCLUDED.insured_amount,
       status = EXCLUDED.status,
       metadata = EXCLUDED.metadata,
       updated_at = now()`,
    [policy.id, ids.client, policy.type, policy.provider, policy.amount, json({ scenario, version })],
  );
}

async function upsertComplianceChecklist(client) {
  await client.query(
    `INSERT INTO compliance_checklists (
      id,
      client_id,
      kyc_status,
      suitability_status,
      consent_status,
      financial_info,
      risk_profile,
      missing_items,
      reviewed_at,
      created_at,
      updated_at
    )
    VALUES (
      $1,
      $2,
      'COMPLETE'::"ComplianceStatus",
      'PARTIAL'::"ComplianceStatus",
      'COMPLETE'::"ComplianceStatus",
      $3::jsonb,
      $4::jsonb,
      $5::text[],
      now(),
      now(),
      now()
    )
    ON CONFLICT (client_id) DO UPDATE SET
      kyc_status = EXCLUDED.kyc_status,
      suitability_status = EXCLUDED.suitability_status,
      consent_status = EXCLUDED.consent_status,
      financial_info = EXCLUDED.financial_info,
      risk_profile = EXCLUDED.risk_profile,
      missing_items = EXCLUDED.missing_items,
      reviewed_at = now(),
      updated_at = now()`,
    [
      ids.compliance,
      ids.client,
      json({ annualIncome: 1800000, dependents: 3 }),
      json({ appetite: "balanced", horizonYears: 20 }),
      ["補齊失能收入保障評估"],
    ],
  );
}

// 清掉 demo 使用者底下、非 seed 的測試客戶（過往 QA/proof 產生的雜訊資料）。
// 只刪 owner 為 demo 使用者且 is_demo=false 的客戶；不動正式 seed 客戶與真實資料。
// 關聯的 family_members / policies / compliance_checklists 由 FK cascade 一併移除。
async function cleanupQaTestClients(client) {
  const demoUserIds = [ids.memberUser, ids.managerUser, ids.collaboratorUser, ids.clientUser];
  const result = await client.query(
    `DELETE FROM clients
     WHERE owner_id = ANY($1::text[])
       AND is_demo = false`,
    [demoUserIds],
  );
  if (result.rowCount > 0) {
    console.log(`Cleaned up ${result.rowCount} non-seed QA/test client(s) under demo users.`);
  }
}

// 把補充 demo 客戶名單寫入 DB，每位帶家庭、保單與合規狀態。
// 業務員名單 owner 為 member，主管名單 owner 為 manager（各自 owner-scoped）。
async function upsertRosterClients(client) {
  for (const entry of demoRoster) {
    await upsertRosterClient(client, entry, ids.memberUser);
  }
  for (const entry of managerRoster) {
    await upsertRosterClient(client, entry, ids.managerUser);
  }
}

async function upsertRosterClient(client, entry, ownerId) {
  const clientId = `demo_client_${entry.slug}`;
  await client.query(
    `INSERT INTO clients (
      id,
      organization_id,
      unit_id,
      owner_id,
      name,
      email,
      phone,
      birth_date,
      occupation,
      annual_income,
      status,
      sensitivity,
      tags,
      ai_tags,
      notes,
      source,
      is_demo,
      demo_seed_key,
      demo_scenario,
      demo_seed_version,
      last_interaction_at,
      created_at,
      updated_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11::"ClientStatus",
      $12::"ClientSensitivity",
      $13::text[],
      $14::text[],
      $15,
      'demo_seed',
      true,
      $16,
      $17,
      $18,
      $19,
      now(),
      now()
    )
    ON CONFLICT (demo_seed_key) DO UPDATE SET
      unit_id = EXCLUDED.unit_id,
      owner_id = EXCLUDED.owner_id,
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      birth_date = EXCLUDED.birth_date,
      occupation = EXCLUDED.occupation,
      annual_income = EXCLUDED.annual_income,
      status = EXCLUDED.status,
      sensitivity = EXCLUDED.sensitivity,
      tags = EXCLUDED.tags,
      ai_tags = EXCLUDED.ai_tags,
      notes = EXCLUDED.notes,
      source = EXCLUDED.source,
      is_demo = true,
      demo_scenario = EXCLUDED.demo_scenario,
      demo_seed_version = EXCLUDED.demo_seed_version,
      last_interaction_at = EXCLUDED.last_interaction_at,
      updated_at = now()`,
    [
      clientId,
      ids.org,
      ids.branch,
      ownerId,
      entry.name,
      entry.email,
      entry.phone,
      entry.birthDate,
      entry.occupation,
      entry.annualIncome,
      entry.status,
      entry.sensitivity,
      entry.tags,
      entry.aiTags,
      entry.notes,
      seed(`client:${entry.slug}`),
      scenario,
      version,
      entry.lastInteraction,
    ],
  );

  for (let index = 0; index < entry.family.length; index += 1) {
    const member = entry.family[index];
    await client.query(
      `INSERT INTO family_members (id, client_id, name, relation, age, metadata, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, now(), now())
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         relation = EXCLUDED.relation,
         age = EXCLUDED.age,
         metadata = EXCLUDED.metadata,
         updated_at = now()`,
      [
        `demo_family_${entry.slug}_${index + 1}`,
        clientId,
        member.name,
        member.relation,
        member.age,
        json({ scenario, version }),
      ],
    );
  }

  for (let index = 0; index < entry.policies.length; index += 1) {
    const policy = entry.policies[index];
    await client.query(
      `INSERT INTO policies (
         id,
         client_id,
         category,
         product_name,
         provider,
         insured_amount,
         status,
         metadata,
         created_at,
         updated_at
       )
       VALUES ($1, $2, $3, $3, $4, $5, 'ACTIVE'::"PolicyStatus", $6::jsonb, now(), now())
       ON CONFLICT (id) DO UPDATE SET
         category = EXCLUDED.category,
         product_name = EXCLUDED.product_name,
         provider = EXCLUDED.provider,
         insured_amount = EXCLUDED.insured_amount,
         status = EXCLUDED.status,
         metadata = EXCLUDED.metadata,
         updated_at = now()`,
      [
        `demo_policy_${entry.slug}_${index + 1}`,
        clientId,
        policy.type,
        policy.provider,
        policy.amount,
        json({ scenario, version }),
      ],
    );
  }

  const compliance = entry.compliance;
  await client.query(
    `INSERT INTO compliance_checklists (
      id,
      client_id,
      kyc_status,
      suitability_status,
      consent_status,
      financial_info,
      risk_profile,
      missing_items,
      reviewed_at,
      created_at,
      updated_at
    )
    VALUES (
      $1, $2,
      $3::"ComplianceStatus",
      $4::"ComplianceStatus",
      $5::"ComplianceStatus",
      $6::jsonb,
      $7::jsonb,
      $8::text[],
      now(),
      now(),
      now()
    )
    ON CONFLICT (client_id) DO UPDATE SET
      kyc_status = EXCLUDED.kyc_status,
      suitability_status = EXCLUDED.suitability_status,
      consent_status = EXCLUDED.consent_status,
      financial_info = EXCLUDED.financial_info,
      risk_profile = EXCLUDED.risk_profile,
      missing_items = EXCLUDED.missing_items,
      reviewed_at = now(),
      updated_at = now()`,
    [
      `demo_compliance_${entry.slug}`,
      clientId,
      compliance.kyc,
      compliance.suitability,
      compliance.consent,
      json(compliance.financialInfo),
      json(compliance.riskProfile),
      compliance.missingItems,
    ],
  );
}

async function upsertVisitPlan(client) {
  await client.query(
    `INSERT INTO visit_plans (
      id,
      organization_id,
      unit_id,
      client_id,
      owner_id,
      purpose,
      status,
      scheduled_at,
      objectives,
      spin_questions,
      objections,
      materials,
      post_visit_notes,
      post_visit_analysis,
      feedback,
      is_demo,
      demo_seed_key,
      demo_scenario,
      demo_seed_version,
      created_at,
      updated_at
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      'ADD_ON'::"VisitPurpose",
      'READY'::"VisitPlanStatus",
      '2026-06-20T02:00:00Z',
      $6::jsonb,
      $7::jsonb,
      $8::jsonb,
      $9::jsonb,
      null,
      null,
      $10::jsonb,
      true,
      $11,
      $12,
      $13,
      now(),
      now()
    )
    ON CONFLICT (demo_seed_key) DO UPDATE SET
      unit_id = EXCLUDED.unit_id,
      owner_id = EXCLUDED.owner_id,
      purpose = EXCLUDED.purpose,
      status = EXCLUDED.status,
      scheduled_at = EXCLUDED.scheduled_at,
      objectives = EXCLUDED.objectives,
      spin_questions = EXCLUDED.spin_questions,
      objections = EXCLUDED.objections,
      materials = EXCLUDED.materials,
      feedback = EXCLUDED.feedback,
      demo_scenario = EXCLUDED.demo_scenario,
      demo_seed_version = EXCLUDED.demo_seed_version,
      updated_at = now()`,
    [
      ids.visitPlan,
      ids.org,
      ids.branch,
      ids.client,
      ids.memberUser,
      json(["確認重大疾病與失能缺口", "釐清家庭現金流安全墊"]),
      json(["目前家庭固定支出是多少？", "若 6 個月無法工作，收入缺口會如何補？"]),
      json(["已有醫療險是否足夠", "預算上限"]),
      json(["保障缺口摘要", "現有保單檢視表"]),
      json({ quality: "seeded", scenario }),
      seed("visit:wang:add-on"),
      scenario,
      version,
    ],
  );
}

async function upsertSpinScenario(client) {
  const outputs = {
    SITUATION: ["王大明為雙薪家庭主要收入來源，扶養配偶與兩名子女。"],
    PROBLEM: ["既有保障缺口集中在重大疾病自費、失能收入中斷與家庭現金流安全墊。"],
    IMPLICATION: ["若收入中斷 6-12 個月，子女教育金與房貸現金流會同時承壓。"],
    NEED_PAYOFF: ["補足失能收入與重大疾病一次金，可降低家庭支柱風險。"],
  };

  await client.query(
    `INSERT INTO spin_sessions (
      id,
      organization_id,
      unit_id,
      client_id,
      owner_id,
      visit_plan_id,
      mode,
      phase,
      status,
      outputs,
      transitions,
      summary,
      metadata,
      is_demo,
      demo_seed_key,
      demo_scenario,
      demo_seed_version,
      created_at,
      updated_at
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      'SELF_CLARIFY'::"SpinMode",
      'COMPLETE'::"SpinPhase",
      'COMPLETED'::"SessionStatus",
      $7::jsonb,
      $8::jsonb,
      $9::jsonb,
      $10::jsonb,
      true,
      $11,
      $12,
      $13,
      now(),
      now()
    )
    ON CONFLICT (demo_seed_key) DO UPDATE SET
      unit_id = EXCLUDED.unit_id,
      owner_id = EXCLUDED.owner_id,
      visit_plan_id = EXCLUDED.visit_plan_id,
      phase = EXCLUDED.phase,
      status = EXCLUDED.status,
      outputs = EXCLUDED.outputs,
      transitions = EXCLUDED.transitions,
      summary = EXCLUDED.summary,
      metadata = EXCLUDED.metadata,
      demo_scenario = EXCLUDED.demo_scenario,
      demo_seed_version = EXCLUDED.demo_seed_version,
      updated_at = now()`,
    [
      ids.spinSession,
      ids.org,
      ids.branch,
      ids.client,
      ids.memberUser,
      ids.visitPlan,
      json(outputs),
      json([
        { from: "SITUATION", to: "PROBLEM", trigger: "AI", timestamp: "2026-06-18T02:00:00Z" },
        { from: "PROBLEM", to: "IMPLICATION", trigger: "AI", timestamp: "2026-06-18T02:05:00Z" },
        { from: "IMPLICATION", to: "NEED_PAYOFF", trigger: "AI", timestamp: "2026-06-18T02:10:00Z" },
      ]),
      json({
        keyInsights: outputs.SITUATION,
        keyProblems: outputs.PROBLEM,
        suggestedActions: outputs.NEED_PAYOFF,
      }),
      json({ scenario, version }),
      seed("spin:wang:gap"),
      scenario,
      version,
    ],
  );

  await upsertSpinMessage(client, {
    id: ids.spinMessageUser,
    role: "USER",
    type: "CHAT",
    content: "請幫我整理王大明家庭保障缺口。",
    phase: "SITUATION",
  });
  await upsertSpinMessage(client, {
    id: ids.spinMessageAssistant,
    role: "ASSISTANT",
    type: "SUMMARY",
    content: "主要缺口在失能收入、重大疾病自費與家庭現金流安全墊。",
    phase: "NEED_PAYOFF",
  });
}

async function upsertSpinMessage(client, message) {
  await client.query(
    `INSERT INTO spin_messages (id, session_id, role, type, content, phase, metadata, created_at)
     VALUES ($1, $2, $3::"MessageRole", $4::"SpinMessageType", $5, $6::"SpinPhase", $7::jsonb, now())
     ON CONFLICT (id) DO UPDATE SET
       role = EXCLUDED.role,
       type = EXCLUDED.type,
       content = EXCLUDED.content,
       phase = EXCLUDED.phase,
       metadata = EXCLUDED.metadata`,
    [message.id, ids.spinSession, message.role, message.type, message.content, message.phase, json({ scenario, version })],
  );
}

async function upsertTheaterScenario(client) {
  await client.query(
    `INSERT INTO theater_sessions (
      id,
      organization_id,
      unit_id,
      client_id,
      owner_id,
      spin_session_id,
      persona_type,
      difficulty,
      tension,
      status,
      score,
      metadata,
      is_demo,
      demo_seed_key,
      demo_scenario,
      demo_seed_version,
      created_at,
      updated_at
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      'CONSERVATIVE'::"TheaterPersonaType",
      'MEDIUM'::"TheaterDifficulty",
      2,
      'COMPLETED'::"SessionStatus",
      $7::jsonb,
      $8::jsonb,
      true,
      $9,
      $10,
      $11,
      now(),
      now()
    )
    ON CONFLICT (demo_seed_key) DO UPDATE SET
      unit_id = EXCLUDED.unit_id,
      owner_id = EXCLUDED.owner_id,
      spin_session_id = EXCLUDED.spin_session_id,
      persona_type = EXCLUDED.persona_type,
      difficulty = EXCLUDED.difficulty,
      tension = EXCLUDED.tension,
      status = EXCLUDED.status,
      score = EXCLUDED.score,
      metadata = EXCLUDED.metadata,
      demo_scenario = EXCLUDED.demo_scenario,
      demo_seed_version = EXCLUDED.demo_seed_version,
      updated_at = now()`,
    [
      ids.theaterSession,
      ids.org,
      ids.branch,
      ids.client,
      ids.memberUser,
      ids.spinSession,
      json({ overall: 82, empathy: 88, clarity: 80, nextStep: "補強失能收入缺口說明" }),
      json({ scenario, version }),
      seed("theater:wang:conservative"),
      scenario,
      version,
    ],
  );

  await upsertTheaterTurn(client, {
    id: ids.theaterTurnAgent,
    role: "AGENT",
    content: "如果發生收入中斷，您希望家庭現金流至少維持幾個月？",
    tensionDelta: -1,
  });
  await upsertTheaterTurn(client, {
    id: ids.theaterTurnClient,
    role: "CLIENT",
    content: "我會擔心保費太高，但 6 個月以上應該比較安心。",
    tensionDelta: 1,
  });
}

async function upsertTheaterTurn(client, turn) {
  await client.query(
    `INSERT INTO theater_turns (id, session_id, role, content, tension_delta, metadata, created_at)
     VALUES ($1, $2, $3::"TheaterTurnRole", $4, $5, $6::jsonb, now())
     ON CONFLICT (id) DO UPDATE SET
       role = EXCLUDED.role,
       content = EXCLUDED.content,
       tension_delta = EXCLUDED.tension_delta,
       metadata = EXCLUDED.metadata`,
    [turn.id, ids.theaterSession, turn.role, turn.content, turn.tensionDelta, json({ scenario, version })],
  );
}

async function upsertReportScenario(client) {
  await client.query(
    `INSERT INTO reports (
      id,
      organization_id,
      unit_id,
      client_id,
      owner_id,
      spin_session_id,
      theater_session_id,
      visit_plan_id,
      title,
      status,
      internal_sections,
      client_sections,
      version,
      is_edited,
      is_demo,
      demo_seed_key,
      demo_scenario,
      demo_seed_version,
      created_at,
      updated_at
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8,
      '王大明保障缺口摘要',
      'SHARED'::"ReportStatus",
      $9::jsonb,
      $10::jsonb,
      1,
      false,
      true,
      $11,
      $12,
      $13,
      now(),
      now()
    )
    ON CONFLICT (demo_seed_key) DO UPDATE SET
      unit_id = EXCLUDED.unit_id,
      owner_id = EXCLUDED.owner_id,
      spin_session_id = EXCLUDED.spin_session_id,
      theater_session_id = EXCLUDED.theater_session_id,
      visit_plan_id = EXCLUDED.visit_plan_id,
      title = EXCLUDED.title,
      status = EXCLUDED.status,
      internal_sections = EXCLUDED.internal_sections,
      client_sections = EXCLUDED.client_sections,
      version = EXCLUDED.version,
      is_edited = EXCLUDED.is_edited,
      demo_scenario = EXCLUDED.demo_scenario,
      demo_seed_version = EXCLUDED.demo_seed_version,
      updated_at = now()`,
    [
      ids.report,
      ids.org,
      ids.branch,
      ids.client,
      ids.memberUser,
      ids.spinSession,
      ids.theaterSession,
      ids.visitPlan,
      json([
        { type: "SUMMARY", title: "內部摘要", content: "家庭支柱風險與醫療缺口需優先處理。" },
        { type: "PERFORMANCE", title: "演練回饋", content: "下一步應降低保費疑慮並量化現金流缺口。" },
      ]),
      json([
        { type: "SUMMARY", title: "保障缺口重點", content: "建議優先補足收入中斷與重大疾病一次金。" },
        { type: "RECOMMENDATION", title: "下一步", content: "安排 30 分鐘檢視現有保障與預算。" },
      ]),
      seed("report:wang:gap"),
      scenario,
      version,
    ],
  );

  await client.query(
    `INSERT INTO report_shares (
      id,
      organization_id,
      unit_id,
      report_id,
      token,
      expires_at,
      access_count,
      cta_config,
      is_demo,
      demo_seed_key,
      demo_scenario,
      demo_seed_version,
      created_at,
      updated_at
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      'demo-share-wang',
      now() + interval '30 days',
      0,
      $5::jsonb,
      true,
      $6,
      $7,
      $8,
      now(),
      now()
    )
    ON CONFLICT (demo_seed_key) DO UPDATE SET
      unit_id = EXCLUDED.unit_id,
      report_id = EXCLUDED.report_id,
      token = EXCLUDED.token,
      expires_at = EXCLUDED.expires_at,
      cta_config = EXCLUDED.cta_config,
      demo_scenario = EXCLUDED.demo_scenario,
      demo_seed_version = EXCLUDED.demo_seed_version,
      updated_at = now()`,
    [
      ids.reportShare,
      ids.org,
      ids.branch,
      ids.report,
      json({ primaryCta: "預約下一步", secondaryCta: "補充資料" }),
      seed("share:wang:gap"),
      scenario,
      version,
    ],
  );
}

function seed(key) {
  return `${scenario}:${key}:v${version}`;
}

function json(value) {
  return JSON.stringify(value);
}

function printConnectionHint(error) {
  if (!error || typeof error !== "object") return;

  if (error.code === "ENOTFOUND") {
    console.error(
      [
        "",
        "Demo seed could not resolve the database host.",
        "Run `pnpm demo:preflight` to verify DIRECT_URL/DATABASE_URL host DNS and connection readiness.",
      ].join("\n"),
    );
  }

  if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
    console.error(
      [
        "",
        "Demo seed could not open a database connection.",
        "Check Supabase network mode, pooler host/port, and whether DIRECT_URL points to a reachable endpoint.",
      ].join("\n"),
    );
  }
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;

  const contents = readFileSync(path, "utf8");

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();

    if (!key || process.env[key] !== undefined) continue;

    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
