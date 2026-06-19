import { existsSync, readFileSync } from "node:fs";
import { Pool } from "pg";

loadEnvFile(".env");

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
    await upsertClientScenario(client);
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
    await client.query(
      `INSERT INTO users (
        id,
        email,
        name,
        status,
        is_demo,
        demo_seed_key,
        demo_scenario,
        demo_seed_version,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, 'ACTIVE'::"UserStatus", true, $4, $5, $6, now(), now())
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        status = 'ACTIVE'::"UserStatus",
        is_demo = true,
        demo_seed_key = EXCLUDED.demo_seed_key,
        demo_scenario = EXCLUDED.demo_scenario,
        demo_seed_version = EXCLUDED.demo_seed_version,
        updated_at = now()`,
      [user.id, user.email, user.name, seed(user.seedKey), scenario, version],
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
      'Demo quickstart 客戶，所有資料可由 seed 重建。',
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
