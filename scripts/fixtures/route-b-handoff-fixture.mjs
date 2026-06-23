export function buildRouteBHandoffFixture(prefix = "route_b_qa") {
  return {
    id: `${prefix}_handoff`,
    sourcePacketId: `${prefix}_packet`,
    scene: {
      id: `${prefix}_scene`,
      sourcePacketId: `${prefix}_packet`,
      title: "林先生的家庭保障劇場",
      scenario: "釐清林先生與配偶對家庭保障的共同決策。",
      readiness: "READY",
      characters: [
        {
          id: "character_focus_lin",
          displayName: "林先生",
          role: "FOCUS_CLIENT",
          isFocus: true,
          publicBrief: "科技公司營運長，重視效率。",
          knownFacts: [material("fact_focus_job", "林先生是科技公司營運長。", "CONFIRMED", "BACKGROUND_FACT")],
          personaHints: [{ label: "可能重視效率", factStatus: "INFERENCE", evidenceIds: ["mem_efficiency"] }],
          unknowns: [material("unknown_spouse", "尚未確認配偶是否參與決策。", "UNKNOWN", "NARRATOR_QUESTION")],
          exemplarLines: [material("line_focus", "我想先知道這件事有沒有必要。", "INFERENCE", "PERSONA_HINT")],
        },
        {
          id: "character_spouse",
          displayName: "林太太",
          role: "DECISION_MAKER",
          isFocus: false,
          publicBrief: "共同決策者，可能關注現金流。",
          knownFacts: [material("fact_spouse", "林太太會一起討論家庭保障。", "CONFIRMED", "BACKGROUND_FACT")],
          personaHints: [{ label: "可能追問保費負擔", factStatus: "INFERENCE", evidenceIds: ["mem_cashflow"] }],
          unknowns: [],
          exemplarLines: [],
        },
        {
          id: "character_partner",
          displayName: "合夥人",
          role: "INFLUENCER",
          isFocus: false,
          publicBrief: "提醒公司責任風險的影響者。",
          knownFacts: [material("fact_partner", "合夥人曾提醒公司責任風險。", "CONFIRMED", "BACKGROUND_FACT")],
          personaHints: [],
          unknowns: [],
          exemplarLines: [],
        },
      ],
      relationships: [
        {
          id: "relation_spouse",
          summary: "林先生與林太太是共同決策關係。",
          factStatus: "CONFIRMED",
          visibilityScope: "GROUP",
          sourceRefs: [{ id: "rel_source", label: "QA fixture", factStatus: "CONFIRMED" }],
        },
      ],
      objections: [material("objection_busy", "太忙，想下次再談。", "INFERENCE", "PERSONA_HINT")],
      narratorQuestions: [material("narrator_spouse", "請確認林太太是否會參與本次拜訪。", "UNKNOWN", "NARRATOR_QUESTION")],
      visibilityRules: [
        {
          scope: "GROUP",
          label: "群聊",
          visibleTo: "EVERYONE",
          canBeQuotedInGroup: true,
          writesConfirmedCrmFact: false,
        },
        {
          scope: "PRIVATE",
          label: "私聊",
          visibleTo: "ADDRESSEE_ONLY",
          canBeQuotedInGroup: false,
          writesConfirmedCrmFact: false,
        },
      ],
      statePatches: [
        {
          id: "state_focus_anxiety",
          targetCharacterId: "character_focus_lin",
          summary: "林先生對長期保費承諾提高警覺。",
          factStatus: "INFERENCE",
          visibilityScope: "PRIVATE",
          requiresConfirmation: true,
          writesConfirmedCrmFact: false,
          allowedWriteTargets: ["SCENE_PRIVATE_STATE", "RELATIONSHIP_STATE"],
        },
      ],
      sourceGrounding: {
        meetingRelationshipSignals: {
          cardCount: 1,
          unknownCount: 1,
          narratorQuestionCount: 1,
          cards: [
            {
              stageCardId: "route_b_meeting_signal_1",
              status: "unknown",
              action: "ASK_IN_NEXT_VISIT",
              priority: "high",
              sourceLabel: "AI Meeting",
              summary: "林太太可能需要共同參與保障決策，仍待確認。",
              narratorQuestion: "請確認林太太是否會一起參與家庭保障討論。",
            },
          ],
          narratorQuestions: ["請確認林太太是否會一起參與家庭保障討論。"],
          boundary: {
            ownerScopedVisitPlanRequired: true,
            browserSuppliedSessionId: false,
            browserSuppliedPersonId: false,
            providerCallAttempted: false,
            aiUsageLogWritten: false,
            storesRawProviderPayload: false,
            rawTranscriptStored: false,
            writesRelationshipGraph: false,
            writesVisitPlan: false,
            writesConfirmedCrmFact: false,
          },
        },
      },
    },
    aiUsagePlan: {
      noProviderDuringHandoffBuild: true,
      calls: [
        {
          kind: "DIRECTOR",
          purpose: "選擇下一位發言者與演出指令。",
          requiresAiUsageLog: true,
          logOn: "SUCCESS_AND_PROVIDER_ERROR",
          storesRawProviderPayload: false,
        },
        {
          kind: "CHARACTER",
          purpose: "產生指定角色的回覆。",
          requiresAiUsageLog: true,
          logOn: "SUCCESS_AND_PROVIDER_ERROR",
          storesRawProviderPayload: false,
        },
        {
          kind: "FEEDBACK",
          purpose: "產生五視角質化回饋。",
          requiresAiUsageLog: true,
          logOn: "SUCCESS_AND_PROVIDER_ERROR",
          storesRawProviderPayload: false,
        },
      ],
    },
    runtimeActivation: {
      routeBEnabled: true,
      canStartProductionSession: true,
      rollbackNote: "Provider disabled 時只停在 guarded-disabled，不宣稱 production multi-character theater。",
    },
    compatibility: {
      legacyPersonaTypeStrategy: "compatibility-only",
      legacyTensionStrategy: "statePatches only",
      legacyScoreStrategy: "qualitative feedback only",
      migrationBoundary: "runtime gate proof",
    },
  };
}

function material(id, text, factStatus, use) {
  return {
    id,
    text,
    factStatus,
    use,
    sourceRefs: [{ id: `${id}_source`, label: "QA fixture", factStatus }],
  };
}
