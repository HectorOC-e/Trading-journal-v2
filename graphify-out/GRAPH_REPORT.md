# Graph Report - .  (2026-07-09)

## Corpus Check
- 0 files · ~0 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 7488 nodes · 11889 edges · 301 communities (182 shown, 119 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 100 edges (avg confidence: 0.72)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- Community 123
- Community 124
- Community 125
- Community 126
- Community 127
- Community 128
- Community 129
- Community 130
- Community 131
- Community 132
- Community 133
- Community 134
- Community 135
- Community 136
- Community 137
- Community 138
- Community 139
- Community 140
- Community 141
- Community 142
- Community 143
- Community 144
- Community 145
- Community 146
- Community 147
- Community 148
- Community 149
- Community 150
- Community 151
- Community 152
- Community 153
- Community 154
- Community 155
- Community 156
- Community 157
- Community 158
- Community 159
- Community 160
- Community 161
- Community 162
- Community 163
- Community 164
- Community 165
- Community 166
- Community 167
- Community 168
- Community 169
- Community 170
- Community 171
- Community 172
- Community 173
- Community 174
- Community 175
- Community 176
- Community 177
- Community 178
- Community 179
- Community 180
- Community 181
- Community 182
- Community 183
- Community 184
- Community 185
- Community 186
- Community 187
- Community 188
- Community 189
- Community 190
- Community 191
- Community 192
- Community 193
- Community 194
- Community 195
- Community 196
- Community 197
- Community 198
- Community 199
- Community 200
- Community 201
- Community 202
- Community 203
- Community 204
- Community 205
- Community 206
- Community 207
- Community 208
- Community 209
- Community 210
- Community 211
- Community 212
- Community 213
- Community 214
- Community 215
- Community 216
- Community 217
- Community 218
- Community 219
- Community 220
- Community 221
- Community 222
- Community 223
- Community 224
- Community 225
- Community 226
- Community 227
- Community 228
- Community 229
- Community 230
- Community 231
- Community 232
- Community 233
- Community 235
- Community 236
- Community 247
- Community 248
- Community 249
- Community 250
- Community 251
- Community 252
- Community 254
- Community 255
- Community 256
- Community 257
- Community 258
- Community 259
- Community 260
- Community 261
- Community 262
- Community 263
- Community 264
- Community 265
- Community 266
- Community 267
- Community 268
- Community 269
- Community 270
- Community 271
- Community 272
- Community 273
- Community 274
- Community 275
- Community 276
- Community 277
- Community 278
- Community 279
- Community 280
- Community 281
- Community 282
- Community 283
- Community 284
- Community 285
- Community 286
- Community 287
- Community 288
- Community 289
- Community 290
- Community 291
- Community 292
- Community 294
- Community 296

## God Nodes (most connected - your core abstractions)
1. `cn()` - 153 edges
2. `trpc` - 68 edges
3. `PrismaClient` - 64 edges
4. `formatErrorForUser()` - 63 edges
5. `PrismaClient` - 41 edges
6. `isWin()` - 40 edges
7. `calcWinRate()` - 34 edges
8. `protectedProcedure` - 34 edges
9. `Prisma__UserClient` - 33 edges
10. `toast` - 33 edges

## Surprising Connections (you probably didn't know these)
- `makeDb()` --indirect_call--> `key()`  [INFERRED]
  src/__tests__/services/analytics/analytics-cache.test.ts → src/server/services/reviews/monthly-card-stats.ts
- `buildAccountStats()` --indirect_call--> `at()`  [INFERRED]
  src/domains/analytics/services/dashboard-analytics.ts → src/__tests__/services/notifications/emit.test.ts
- `Dropdown()` --indirect_call--> `handler()`  [INFERRED]
  src/components/ui/market-select.tsx → src/app/api/trpc/[trpc]/route.ts
- `Convención de proyecto: usar graphify (query/path/explain/update) antes de grep/browsing crudo` --rationale_for--> `docs/PROJECT_GUIDE.md — léeme primero: qué es, módulos, stack, mapa de código`  [INFERRED]
  CLAUDE.md → README.md
- `SetupModal()` --indirect_call--> `d()`  [INFERRED]
  src/app/playbook/page.tsx → src/__tests__/services/learning/digest-builder.test.ts

## Import Cycles
- 3-file cycle: `src/server/trpc/root.ts -> src/server/trpc/routers/trades.ts -> src/types/index.ts -> src/server/trpc/root.ts`
- 3-file cycle: `src/server/trpc/root.ts -> src/server/trpc/routers/accounts.ts -> src/types/index.ts -> src/server/trpc/root.ts`
- 3-file cycle: `src/server/trpc/root.ts -> src/server/trpc/routers/withdrawals.ts -> src/types/index.ts -> src/server/trpc/root.ts`
- 3-file cycle: `src/lib/generated/prisma/internal/prismaNamespace.ts -> src/lib/generated/prisma/models.ts -> src/lib/generated/prisma/models/SetupVersion.ts -> src/lib/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/lib/generated/prisma/internal/prismaNamespace.ts -> src/lib/generated/prisma/models.ts -> src/lib/generated/prisma/models/TradeEvent.ts -> src/lib/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/lib/generated/prisma/internal/prismaNamespace.ts -> src/lib/generated/prisma/models.ts -> src/lib/generated/prisma/models/DomainEvent.ts -> src/lib/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/lib/generated/prisma/internal/prismaNamespace.ts -> src/lib/generated/prisma/models.ts -> src/lib/generated/prisma/models/Withdrawal.ts -> src/lib/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/lib/generated/prisma/internal/prismaNamespace.ts -> src/lib/generated/prisma/models.ts -> src/lib/generated/prisma/models/UserAiSettings.ts -> src/lib/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/lib/generated/prisma/internal/prismaNamespace.ts -> src/lib/generated/prisma/models.ts -> src/lib/generated/prisma/models/Account.ts -> src/lib/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/lib/generated/prisma/internal/prismaNamespace.ts -> src/lib/generated/prisma/models.ts -> src/lib/generated/prisma/models/Setup.ts -> src/lib/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/lib/generated/prisma/internal/prismaNamespace.ts -> src/lib/generated/prisma/models.ts -> src/lib/generated/prisma/models/MonthlyReview.ts -> src/lib/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/lib/generated/prisma/internal/prismaNamespace.ts -> src/lib/generated/prisma/models.ts -> src/lib/generated/prisma/models/Trade.ts -> src/lib/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/lib/generated/prisma/internal/prismaNamespace.ts -> src/lib/generated/prisma/models.ts -> src/lib/generated/prisma/models/TradingSessionLog.ts -> src/lib/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/lib/generated/prisma/commonInputTypes.ts -> src/lib/generated/prisma/internal/prismaNamespace.ts -> src/lib/generated/prisma/models.ts -> src/lib/generated/prisma/commonInputTypes.ts`
- 3-file cycle: `src/lib/generated/prisma/internal/prismaNamespace.ts -> src/lib/generated/prisma/models.ts -> src/lib/generated/prisma/models/AccountLog.ts -> src/lib/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/lib/generated/prisma/internal/prismaNamespace.ts -> src/lib/generated/prisma/models.ts -> src/lib/generated/prisma/models/Automation.ts -> src/lib/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/lib/generated/prisma/internal/prismaNamespace.ts -> src/lib/generated/prisma/models.ts -> src/lib/generated/prisma/models/CustomPalette.ts -> src/lib/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/lib/generated/prisma/internal/prismaNamespace.ts -> src/lib/generated/prisma/models.ts -> src/lib/generated/prisma/models/EmailLog.ts -> src/lib/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/lib/generated/prisma/internal/prismaNamespace.ts -> src/lib/generated/prisma/models.ts -> src/lib/generated/prisma/models/Insight.ts -> src/lib/generated/prisma/internal/prismaNamespace.ts`
- 3-file cycle: `src/lib/generated/prisma/internal/prismaNamespace.ts -> src/lib/generated/prisma/models.ts -> src/lib/generated/prisma/models/LearningResource.ts -> src/lib/generated/prisma/internal/prismaNamespace.ts`

## Hyperedges (group relationships)
- **Mecanismo de outbox: D1 entrega EV1/EV2 vía DomainEvent (E5)** — docs_architecture_d1, docs_architecture_e5, docs_architecture_ev1, docs_architecture_ev2 [EXTRACTED 1.00]
- **Loop de comportamiento: D4 orquesta Commitment/CommitmentCheck/Reinforcement** — docs_architecture_d4, docs_architecture_e7, docs_architecture_e8, docs_architecture_e9 [EXTRACTED 1.00]
- **Loop de comportamiento: behavior engine + reglas unificadas + intervenciones** — docs_project_guide_behavior_engine, docs_project_guide_reglas_unificadas, docs_project_guide_intervenciones [EXTRACTED 1.00]
- **Deuda técnica de infraestructura tRPC/Supabase (TD-018, TD-019, stack)** — docs_status_td_018, docs_status_td_019, docs_project_guide_stack [INFERRED 0.75]
- **Tres documentos vivos referenciados desde README** — readme_project_guide, readme_architecture, readme_status [EXTRACTED 1.00]
- **Dos anexos de documentación referenciados desde README** — readme_changelog, readme_auditoria [EXTRACTED 1.00]
- **CI/CD antierrores pipeline** — _github_workflows_ci_checks, _github_workflows_ci_e2e, _github_workflows_ci_migrate_validate, _github_workflows_ci_migrate_deploy [EXTRACTED 1.00]

## Communities (301 total, 119 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (389): AggregateUser, BoolFieldUpdateOperationsInput, DateTimeFieldUpdateOperationsInput, GetUserAggregateType, GetUserGroupByPayload, IntFieldUpdateOperationsInput, NullableDateTimeFieldUpdateOperationsInput, NullableDecimalFieldUpdateOperationsInput (+381 more)

### Community 1 - "Community 1"
Cohesion: 0.01
Nodes (149): AggregateTrade, GetTradeAggregateType, GetTradeGroupByPayload, Trade$checklistResultArgs, Trade$embeddingArgs, Trade$eventsArgs, Trade$setupArgs, TradeAggregateArgs (+141 more)

### Community 2 - "Community 2"
Cohesion: 0.01
Nodes (138): AccountLogScalarFieldEnum, AccountScalarFieldEnum, Args, At, AtLeast, AtLoose, AtStrict, AutomationScalarFieldEnum (+130 more)

### Community 3 - "Community 3"
Cohesion: 0.02
Nodes (132): Account$logsArgs, Account$tradesArgs, Account$weeklyReviewsArgs, Account$withdrawalsArgs, AccountAggregateArgs, AccountAvgAggregateInputType, AccountAvgAggregateOutputType, AccountAvgOrderByAggregateInput (+124 more)

### Community 4 - "Community 4"
Cohesion: 0.02
Nodes (127): AggregateSetup, GetSetupAggregateType, GetSetupGroupByPayload, Setup$linkedResourcesArgs, Setup$tradesArgs, Setup$versionsArgs, SetupAggregateArgs, SetupAvgAggregateInputType (+119 more)

### Community 5 - "Community 5"
Cohesion: 0.02
Nodes (122): AggregateLearningResource, GetLearningResourceAggregateType, GetLearningResourceGroupByPayload, LearningResource$linkedSetupsArgs, LearningResource$reviewsArgs, LearningResource$studySessionsArgs, LearningResourceAggregateArgs, LearningResourceAvgAggregateInputType (+114 more)

### Community 6 - "Community 6"
Cohesion: 0.04
Nodes (81): POST(), USER_SELECT, GET(), Insight, CoachStreamOptions, usableCandidates(), PrismaClient, LogEntry (+73 more)

### Community 7 - "Community 7"
Cohesion: 0.04
Nodes (74): POST(), PERIODS, POST(), PERIODS, POST(), ALLOWED_MIME, POST(), buildTraderContext() (+66 more)

### Community 8 - "Community 8"
Cohesion: 0.05
Nodes (74): fmt(), FocusSession(), PlanSessionModal(), todayISO(), AddEditResourceModal(), ResourceFromDB, ResourceFromDB, ALL_TYPES (+66 more)

### Community 9 - "Community 9"
Cohesion: 0.02
Nodes (96): AggregateResourceReview, GetResourceReviewAggregateType, GetResourceReviewGroupByPayload, ResourceReviewAggregateArgs, ResourceReviewAvgAggregateInputType, ResourceReviewAvgAggregateOutputType, ResourceReviewAvgOrderByAggregateInput, ResourceReviewCountAggregateInputType (+88 more)

### Community 10 - "Community 10"
Cohesion: 0.02
Nodes (95): AggregateWeeklyReview, GetWeeklyReviewAggregateType, GetWeeklyReviewGroupByPayload, WeeklyReview$accountArgs, WeeklyReviewAggregateArgs, WeeklyReviewAvgAggregateInputType, WeeklyReviewAvgAggregateOutputType, WeeklyReviewAvgOrderByAggregateInput (+87 more)

### Community 11 - "Community 11"
Cohesion: 0.02
Nodes (94): AggregateStudySession, GetStudySessionAggregateType, GetStudySessionGroupByPayload, StudySessionAggregateArgs, StudySessionAvgAggregateInputType, StudySessionAvgAggregateOutputType, StudySessionAvgOrderByAggregateInput, StudySessionCountAggregateInputType (+86 more)

### Community 12 - "Community 12"
Cohesion: 0.02
Nodes (94): AggregateTradeEvent, GetTradeEventAggregateType, GetTradeEventGroupByPayload, TradeEventAggregateArgs, TradeEventAvgAggregateInputType, TradeEventAvgAggregateOutputType, TradeEventAvgOrderByAggregateInput, TradeEventCountAggregateInputType (+86 more)

### Community 13 - "Community 13"
Cohesion: 0.02
Nodes (94): AggregateWithdrawal, GetWithdrawalAggregateType, GetWithdrawalGroupByPayload, WithdrawalAggregateArgs, WithdrawalAvgAggregateInputType, WithdrawalAvgAggregateOutputType, WithdrawalAvgOrderByAggregateInput, WithdrawalCountAggregateInputType (+86 more)

### Community 14 - "Community 14"
Cohesion: 0.02
Nodes (93): AggregateTradeChecklistResult, GetTradeChecklistResultAggregateType, GetTradeChecklistResultGroupByPayload, TradeChecklistResultAggregateArgs, TradeChecklistResultAvgAggregateInputType, TradeChecklistResultAvgAggregateOutputType, TradeChecklistResultAvgOrderByAggregateInput, TradeChecklistResultCountAggregateInputType (+85 more)

### Community 15 - "Community 15"
Cohesion: 0.05
Nodes (74): AccountBalance, AccountExposure, AccountLimits, AccountStat, AccountWithLimits, buildAccountExposure(), buildAccountStats(), buildDiscipline() (+66 more)

### Community 16 - "Community 16"
Cohesion: 0.02
Nodes (88): AccountLogAggregateArgs, AccountLogCountAggregateInputType, AccountLogCountAggregateOutputType, AccountLogCountArgs, AccountLogCountOrderByAggregateInput, AccountLogCreateArgs, AccountLogCreateInput, AccountLogCreateManyAccountInput (+80 more)

### Community 17 - "Community 17"
Cohesion: 0.02
Nodes (88): AggregateMonthlyReview, GetMonthlyReviewAggregateType, GetMonthlyReviewGroupByPayload, MonthlyReviewAggregateArgs, MonthlyReviewAvgAggregateInputType, MonthlyReviewAvgAggregateOutputType, MonthlyReviewAvgOrderByAggregateInput, MonthlyReviewCountAggregateInputType (+80 more)

### Community 18 - "Community 18"
Cohesion: 0.02
Nodes (85): AggregateTradeEmbedding, GetTradeEmbeddingAggregateType, GetTradeEmbeddingGroupByPayload, TradeEmbeddingAggregateArgs, TradeEmbeddingCountAggregateInputType, TradeEmbeddingCountAggregateOutputType, TradeEmbeddingCountArgs, TradeEmbeddingCountOrderByAggregateInput (+77 more)

### Community 19 - "Community 19"
Cohesion: 0.06
Nodes (51): LinkSetupModal(), ResourceFromDB, SyncBalanceModal(), SyncBalanceModalProps, syncSchema, SyncValues, metadata, viewport (+43 more)

### Community 20 - "Community 20"
Cohesion: 0.05
Nodes (60): Stat(), DOW, TOUR_STEPS, DAYS, EditionHeader(), EditionHeaderData, money(), TONE (+52 more)

### Community 21 - "Community 21"
Cohesion: 0.02
Nodes (80): AggregateInsight, GetInsightAggregateType, GetInsightGroupByPayload, InsightAggregateArgs, InsightAvgAggregateInputType, InsightAvgAggregateOutputType, InsightAvgOrderByAggregateInput, InsightCountAggregateInputType (+72 more)

### Community 22 - "Community 22"
Cohesion: 0.02
Nodes (80): AggregateSetupVersion, GetSetupVersionAggregateType, GetSetupVersionGroupByPayload, SetupVersionAggregateArgs, SetupVersionAvgAggregateInputType, SetupVersionAvgAggregateOutputType, SetupVersionAvgOrderByAggregateInput, SetupVersionCountAggregateInputType (+72 more)

### Community 23 - "Community 23"
Cohesion: 0.02
Nodes (80): AggregateTag, GetTagAggregateType, GetTagGroupByPayload, TagAggregateArgs, TagAvgAggregateInputType, TagAvgAggregateOutputType, TagAvgOrderByAggregateInput, TagCountAggregateInputType (+72 more)

### Community 24 - "Community 24"
Cohesion: 0.02
Nodes (80): AggregateTradingSessionLog, GetTradingSessionLogAggregateType, GetTradingSessionLogGroupByPayload, TradingSessionLogAggregateArgs, TradingSessionLogAvgAggregateInputType, TradingSessionLogAvgAggregateOutputType, TradingSessionLogAvgOrderByAggregateInput, TradingSessionLogCountAggregateInputType (+72 more)

### Community 25 - "Community 25"
Cohesion: 0.03
Nodes (79): AggregateAutomation, AutomationAggregateArgs, AutomationAvgAggregateInputType, AutomationAvgAggregateOutputType, AutomationAvgOrderByAggregateInput, AutomationCountAggregateInputType, AutomationCountAggregateOutputType, AutomationCountArgs (+71 more)

### Community 26 - "Community 26"
Cohesion: 0.03
Nodes (79): AggregateCustomPalette, CustomPaletteAggregateArgs, CustomPaletteAvgAggregateInputType, CustomPaletteAvgAggregateOutputType, CustomPaletteAvgOrderByAggregateInput, CustomPaletteCountAggregateInputType, CustomPaletteCountAggregateOutputType, CustomPaletteCountArgs (+71 more)

### Community 27 - "Community 27"
Cohesion: 0.03
Nodes (79): AggregateDomainEvent, DomainEventAggregateArgs, DomainEventAvgAggregateInputType, DomainEventAvgAggregateOutputType, DomainEventAvgOrderByAggregateInput, DomainEventCountAggregateInputType, DomainEventCountAggregateOutputType, DomainEventCountArgs (+71 more)

### Community 28 - "Community 28"
Cohesion: 0.03
Nodes (79): AggregateMonthlyGoal, GetMonthlyGoalAggregateType, GetMonthlyGoalGroupByPayload, MonthlyGoalAggregateArgs, MonthlyGoalAvgAggregateInputType, MonthlyGoalAvgAggregateOutputType, MonthlyGoalAvgOrderByAggregateInput, MonthlyGoalCountAggregateInputType (+71 more)

### Community 29 - "Community 29"
Cohesion: 0.03
Nodes (79): AggregateRule, GetRuleAggregateType, GetRuleGroupByPayload, RuleAggregateArgs, RuleAvgAggregateInputType, RuleAvgAggregateOutputType, RuleAvgOrderByAggregateInput, RuleCountAggregateInputType (+71 more)

### Community 30 - "Community 30"
Cohesion: 0.03
Nodes (77): AggregateUserPreferences, GetUserPreferencesAggregateType, GetUserPreferencesGroupByPayload, UserPreferencesAggregateArgs, UserPreferencesAvgAggregateInputType, UserPreferencesAvgAggregateOutputType, UserPreferencesAvgOrderByAggregateInput, UserPreferencesCountAggregateInputType (+69 more)

### Community 31 - "Community 31"
Cohesion: 0.03
Nodes (76): AggregateMarket, GetMarketAggregateType, GetMarketGroupByPayload, MarketAggregateArgs, MarketCountAggregateInputType, MarketCountAggregateOutputType, MarketCountArgs, MarketCountOrderByAggregateInput (+68 more)

### Community 32 - "Community 32"
Cohesion: 0.03
Nodes (76): AggregateNotificationPreference, GetNotificationPreferenceAggregateType, GetNotificationPreferenceGroupByPayload, NotificationPreferenceAggregateArgs, NotificationPreferenceCountAggregateInputType, NotificationPreferenceCountAggregateOutputType, NotificationPreferenceCountArgs, NotificationPreferenceCountOrderByAggregateInput (+68 more)

### Community 33 - "Community 33"
Cohesion: 0.05
Nodes (63): ResourceFromDB, ReviewFromDB, RevisarRecursoModal(), effectiveMasteryLevel(), isMastered(), isReviewDue(), MASTERY_STAGES, masteryLevel() (+55 more)

### Community 34 - "Community 34"
Cohesion: 0.03
Nodes (74): AggregateEmailLog, EmailLogAggregateArgs, EmailLogCountAggregateInputType, EmailLogCountAggregateOutputType, EmailLogCountArgs, EmailLogCountOrderByAggregateInput, EmailLogCreateArgs, EmailLogCreateInput (+66 more)

### Community 35 - "Community 35"
Cohesion: 0.03
Nodes (74): AggregateTradeStatsCache, GetTradeStatsCacheAggregateType, GetTradeStatsCacheGroupByPayload, TradeStatsCacheAggregateArgs, TradeStatsCacheCountAggregateInputType, TradeStatsCacheCountAggregateOutputType, TradeStatsCacheCountArgs, TradeStatsCacheCountOrderByAggregateInput (+66 more)

### Community 36 - "Community 36"
Cohesion: 0.03
Nodes (74): AggregateUserAiConfig, GetUserAiConfigAggregateType, GetUserAiConfigGroupByPayload, UserAiConfigAggregateArgs, UserAiConfigCountAggregateInputType, UserAiConfigCountAggregateOutputType, UserAiConfigCountArgs, UserAiConfigCountOrderByAggregateInput (+66 more)

### Community 37 - "Community 37"
Cohesion: 0.03
Nodes (73): AggregateNotification, GetNotificationAggregateType, GetNotificationGroupByPayload, NotificationAggregateArgs, NotificationCountAggregateInputType, NotificationCountAggregateOutputType, NotificationCountArgs, NotificationCountOrderByAggregateInput (+65 more)

### Community 38 - "Community 38"
Cohesion: 0.05
Nodes (56): RFC-4180, SetupModal(), DeleteCell(), fmtMoney(), FORM_INIT, RetirosPage(), RetirosTable(), STATUS_META (+48 more)

### Community 39 - "Community 39"
Cohesion: 0.05
Nodes (56): ACCOUNT_STATUS_META, AccountCard(), AccountExposure, AccountRisk, formatSyncAgo(), isPropFirmLike(), KpiBox(), RawAccount (+48 more)

### Community 40 - "Community 40"
Cohesion: 0.03
Nodes (68): AggregateUserAiSettings, GetUserAiSettingsAggregateType, GetUserAiSettingsGroupByPayload, NullableStringFieldUpdateOperationsInput, UserAiSettingsAggregateArgs, UserAiSettingsCountAggregateInputType, UserAiSettingsCountAggregateOutputType, UserAiSettingsCountArgs (+60 more)

### Community 41 - "Community 41"
Cohesion: 0.06
Nodes (50): AccountsIntel(), amt(), AnalyticsPage(), Edges(), fmt(), GoalRow(), Goals(), Institutional (+42 more)

### Community 42 - "Community 42"
Cohesion: 0.04
Nodes (54): extractTradeId(), POST(), secretsMatch(), buildContext(), ContextAccount, ContextTrade, mondayOf(), EmbedOptions (+46 more)

### Community 43 - "Community 43"
Cohesion: 0.05
Nodes (48): HoyTab(), ALL_TYPES, ProgresoSections(), ResourceFromDB, TYPE_COLORS, ResourceFromDB, useResourceActions(), SetupImpactModal() (+40 more)

### Community 44 - "Community 44"
Cohesion: 0.03
Nodes (62): BoolFilter, BoolWithAggregatesFilter, DateTimeFilter, DateTimeNullableFilter, DateTimeNullableWithAggregatesFilter, DateTimeWithAggregatesFilter, DecimalFilter, DecimalNullableFilter (+54 more)

### Community 45 - "Community 45"
Cohesion: 0.05
Nodes (44): computeDisciplineScore(), DisciplineDetail, DisciplinePeriod, DisciplineResult, calcDisciplineScore(), DisciplineBreakdown, DisciplineParams, calcNetPnl() (+36 more)

### Community 46 - "Community 46"
Cohesion: 0.06
Nodes (50): MarketItem, TradesPage(), MetricRowProps, SESSION_COLOR, SESSION_SHORT, TradeDetailPanel(), TradeDetailPanelProps, getResult() (+42 more)

### Community 47 - "Community 47"
Cohesion: 0.05
Nodes (45): NuevoRetiroModal(), SelectableTagChip(), SIZE, TagChip(), TagChipView(), EditTradeModal(), EditTradeModalProps, EMOTION_OPTIONS (+37 more)

### Community 48 - "Community 48"
Cohesion: 0.07
Nodes (33): Period, useDashboardStats(), DashboardPage(), Tab, TABS, VALID_PERIODS, checklistColor(), getWeekKey() (+25 more)

### Community 49 - "Community 49"
Cohesion: 0.07
Nodes (43): ADR-000 — Decisiones de raíz de Trading Journal v3.1, ADR-001 (referenciado: resuelto por D1, outbox+dispatcher), Analytics (bounded context, determinista), Behavior Engine (bounded context: loop de mejora), Coach (subsistema: orquestador + agente(s) + tools), Cognitive Engine (bounded context: events, intervention, memory, coach), D1 — Outbox transaccional + dispatcher, dos caminos de entrega, D2 — Cognitive Engine aislado (frontera irreversible) (+35 more)

### Community 50 - "Community 50"
Cohesion: 0.10
Nodes (33): AccountIntel, AnalyticsBundle, buildAnalyticsBundle(), EmotionIntel, holdMinutes(), MarketIntel, round1(), round2() (+25 more)

### Community 51 - "Community 51"
Cohesion: 0.10
Nodes (34): AnalyticsTrade, bySymbolDate(), detectAccountRisk(), detectEmotionPerformance(), detectIntradayDecay(), detectLosingStreak(), detectSetupConcentration(), detectWeekdayDiscipline() (+26 more)

### Community 52 - "Community 52"
Cohesion: 0.09
Nodes (34): assertTradeable(), autoUnlock(), EnforceableAccount, evaluateAndLock(), hasAnyLimit(), loadAccountRisk(), LOCK_REASON_TEXT, lockAccount() (+26 more)

### Community 53 - "Community 53"
Cohesion: 0.05
Nodes (43): dependencies, @anthropic-ai/sdk, class-variance-authority, clsx, dotenv, framer-motion, @hookform/resolvers, katex (+35 more)

### Community 54 - "Community 54"
Cohesion: 0.05
Nodes (40): AccountLogScalarFieldEnum, AccountScalarFieldEnum, AutomationScalarFieldEnum, CustomPaletteScalarFieldEnum, DomainEventScalarFieldEnum, EmailLogScalarFieldEnum, InsightScalarFieldEnum, JsonNullValueFilter (+32 more)

### Community 55 - "Community 55"
Cohesion: 0.10
Nodes (29): buildMonthlyReport(), MonthlyReport, ReportTrade, sessionsOf(), buildWeeklyReport(), DAY_LABELS, WeeklyReport, MonthlyReview (+21 more)

### Community 57 - "Community 57"
Cohesion: 0.09
Nodes (25): POST(), Provider, rateLimiter, testAnthropicKey(), testOpenAIKey(), testOpenRouterKey(), ConnectivityResult, testProviderConnectivity() (+17 more)

### Community 58 - "Community 58"
Cohesion: 0.13
Nodes (22): DigestModel, CtaButton(), Divider(), EmailFooter(), EmailLayout(), ProgressBlock(), Stat, StatRow() (+14 more)

### Community 59 - "Community 59"
Cohesion: 0.07
Nodes (26): COLORS, DbSetup, Direction, DirectionChip(), FORM_INIT, HealthStatus, MARKET_FILTERS, MARKETS (+18 more)

### Community 60 - "Community 60"
Cohesion: 0.10
Nodes (30): assembleContextBlock(), AssembleInput, isInjectable(), MemoryExtraction, MemoryKind, MemoryStatus, parseMemoryExtraction(), ProposedMemory (+22 more)

### Community 61 - "Community 61"
Cohesion: 0.11
Nodes (26): CardEquityChart(), Campaign(), disciplineColor(), fmtMoney(), GRADE_TONE, pnlColor(), ReviewCard(), ReviewFromDB (+18 more)

### Community 62 - "Community 62"
Cohesion: 0.06
Nodes (32): Account, AccountLog, Automation, CustomPalette, DomainEvent, EmailLog, $Enums, Insight (+24 more)

### Community 63 - "Community 63"
Cohesion: 0.11
Nodes (20): AuthResult, POST(), USER_SELECT, LearningDigest(), addDaysISO(), localDateISO(), localHour(), monthStartISO() (+12 more)

### Community 64 - "Community 64"
Cohesion: 0.12
Nodes (28): EquityCurveChart(), PnlTrendChart(), TrendTooltip(), DownloadPdfButton(), pnlColor(), AccountBreakdown(), Analytics, BreakdownBars() (+20 more)

### Community 65 - "Community 65"
Cohesion: 0.06
Nodes (31): 1. EXECUTIVE SUMMARY, 2. HALLAZGOS CRÍTICOS (los que mueven la aguja), 3.10 Etiquetas, 3.11 Mercados, 3.1 Dashboard, 3.2 Trades (journaling), 3.3 Psicología, 3.4 Playbook (+23 more)

### Community 66 - "Community 66"
Cohesion: 0.08
Nodes (26): RawAccountRow, RawLearningRow, RawMarketRow, RawReviewRow, RawRuleRow, RawSessionRow, RawSetupRow, RawStudySessionRow (+18 more)

### Community 67 - "Community 67"
Cohesion: 0.11
Nodes (28): betaBinomialEstimate(), betacf(), BetaPrior, betaQuantile(), cohensH(), DEFAULT_BETA_PRIOR, DEFAULT_NORMAL_PRIOR, DirectionalEstimate (+20 more)

### Community 68 - "Community 68"
Cohesion: 0.10
Nodes (22): ErrorCard, ErrorCardInput, ErrorTrade, generateErrorCards(), computeNextReview(), Grade, PerfSignal, SrsInput (+14 more)

### Community 70 - "Community 70"
Cohesion: 0.13
Nodes (22): addDays(), compareCurrentVsPrevious(), Comparison, Dated, isCount(), rollingWindow(), RollingWindowOpts, sortByDate() (+14 more)

### Community 71 - "Community 71"
Cohesion: 0.16
Nodes (23): RuleDraft, ProposedRule, buildMigrationReportForUser(), MigrationReportTotals, PROTECTION_TEMPLATE_MAP, PROTECTION_TEMPLATES, ProtectionTemplate, templateToUnifiedRule() (+15 more)

### Community 72 - "Community 72"
Cohesion: 0.12
Nodes (20): CreateAction, IconTab(), MobileBottomBar(), NavItem, useReducedMotion(), DeskItem(), MobileClock(), NAV (+12 more)

### Community 73 - "Community 73"
Cohesion: 0.14
Nodes (21): RiskBudget, AnomalyInput, AnomalyResult, assembleTodayFeed(), BASE, detectDailyAnomaly(), SEVERITY_MULT, SignalInput (+13 more)

### Community 74 - "Community 74"
Cohesion: 0.13
Nodes (23): ActionKind, clamp01(), DayState, decideIntervention(), DecisionOpts, detectInterventions(), FatigueState, InterventionCandidate (+15 more)

### Community 75 - "Community 75"
Cohesion: 0.11
Nodes (19): POST(), ADR-0001, dispatchPending(), DispatchResult, DomainEventRecord, EventHandler, EventStatus, EventTransition (+11 more)

### Community 76 - "Community 76"
Cohesion: 0.15
Nodes (20): dupKey(), POST(), storedKey(), toDirection(), DryRunResponse, CTRADER_COLS, detectFormat(), parseCtraderDate() (+12 more)

### Community 77 - "Community 77"
Cohesion: 0.12
Nodes (19): ChecklistEvaluation, ChecklistState, evaluateChecklist(), isRegime(), Regime, REGIME_VALUES, checkDailyLossLimit(), checkLossLimit() (+11 more)

### Community 78 - "Community 78"
Cohesion: 0.14
Nodes (16): computeInstrumentEdges(), EdgeVerdict, InstrumentEdge, InstrumentEdgeResult, InstrumentTrade, mean(), computeTagEdges(), mean() (+8 more)

### Community 79 - "Community 79"
Cohesion: 0.16
Nodes (18): calibration(), CheckinInput, CheckinResult, checkinVerdict, clamp(), LABEL, avg(), MoodSample (+10 more)

### Community 80 - "Community 80"
Cohesion: 0.18
Nodes (16): runAction(), compare(), evaluate(), toNum(), rulesSourceIsUnified(), runAutomations(), RunResult, runRuleEngine() (+8 more)

### Community 81 - "Community 81"
Cohesion: 0.17
Nodes (16): mean(), oneSampleTTest(), sampleVariance(), studentTTwoSidedP(), TTestResult, welchTTest(), detectEdgeDecay(), EdgeDecayInput (+8 more)

### Community 82 - "Community 82"
Cohesion: 0.12
Nodes (18): AutomationLike, deleteRuleForAutomation(), patchRuleForAutomation(), ruleFieldsFromAutomation(), syncRuleFromAutomation(), BASE_TEMPLATES, PROTECTION_AS_AUTOMATION, TEMPLATE_MAP (+10 more)

### Community 83 - "Community 83"
Cohesion: 0.10
Nodes (5): handler(), StatusSelect(), createTRPCContext(), AppRouter, base

### Community 84 - "Community 84"
Cohesion: 0.16
Nodes (15): ComputedInsight, InsightStatus, PersistedInsightRef, reconcileInsights(), ReconcilePlan, ADR-0002, loadActiveRefs(), persistInsights() (+7 more)

### Community 85 - "Community 85"
Cohesion: 0.13
Nodes (20): InsightCategory, InsightSeverity, buildPeriodSummary(), CATEGORY_TAG, downsample(), loadPatterns(), loadReviewsOverview(), money() (+12 more)

### Community 86 - "Community 86"
Cohesion: 0.16
Nodes (19): CommitmentWindow, getVerifier(), publishEvent(), acceptProposedCommitment(), carryOverCommitments(), createCommitmentFromInsight(), CreateCommitmentOverrides, dismissProposedCommitment() (+11 more)

### Community 87 - "Community 87"
Cohesion: 0.20
Nodes (16): AppError, isAppError(), toUserMessage(), TRPC_TO_CODE, LABELS, MessageCode, interpolate(), isMessageCode() (+8 more)

### Community 88 - "Community 88"
Cohesion: 0.13
Nodes (21): ACCOUNTS, between(), buildTrade(), c, cols, DRY, EMO_LOSS, EMO_WIN (+13 more)

### Community 89 - "Community 89"
Cohesion: 0.12
Nodes (14): Context, protectedProcedure, t, accountLogsRouter, goalsRouter, MarketInput, marketsRouter, monthlyGoalsRouter (+6 more)

### Community 90 - "Community 90"
Cohesion: 0.12
Nodes (21): Behavior engine (insight→compromiso→regla→verificación→refuerzo), Digest cognitivo semanal (notificación opt-outable), Feed HOY (TodayFeed + RiskBudgetMeter), Índice de mejora (ImprovementScore), Intervenciones (InterventionOverlay, motor determinista), Memoria del coach (4 capas: episódica/semántica/identidad/mejora), Persona: Funded Trader, Persona: Prop Firm Candidate (+13 more)

### Community 91 - "Community 91"
Cohesion: 0.10
Nodes (20): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+12 more)

### Community 92 - "Community 92"
Cohesion: 0.19
Nodes (18): CreatorModal(), accentContrastFor(), bestContrastOn(), clamp01(), configFromHex(), contrastRatio(), hexToOklch(), hexToRgb() (+10 more)

### Community 93 - "Community 93"
Cohesion: 0.16
Nodes (17): Block, CALLOUT, CALLOUT_ALIASES, CalloutType, CODE_KEYWORDS, CodeBlock(), detectCallout(), HEADING_CLASS (+9 more)

### Community 94 - "Community 94"
Cohesion: 0.18
Nodes (14): ImprovementResult, computeRegimePerformance(), mean(), RegimePerformanceResult, RegimeStat, RegimeTrade, getImprovement(), ImprovementOverview (+6 more)

### Community 95 - "Community 95"
Cohesion: 0.20
Nodes (14): NotificacionesPage(), NotificationBell(), CenterPanel(), CenterSheet(), formatNotifTime(), NotificationItem(), NotificationItemProps, TYPE_STYLE (+6 more)

### Community 96 - "Community 96"
Cohesion: 0.15
Nodes (15): CMP_LABEL, ConditionGroup(), Group, isLeaf(), isNot(), newLeaf(), NotNode, ENUM (+7 more)

### Community 97 - "Community 97"
Cohesion: 0.17
Nodes (15): minutesThisWeek(), pickStudySuggestion(), ResourceProgressLite, ResourceProgressUpdate, startOfWeekUTC(), studyStreak(), StudySuggestion, StudySuggestionKind (+7 more)

### Community 98 - "Community 98"
Cohesion: 0.19
Nodes (13): POST(), POST(), checkCronAuth(), timingSafeMatch(), buildCognitiveDigest(), DigestInput, DigestResult, evaluateWindowCommitments() (+5 more)

### Community 99 - "Community 99"
Cohesion: 0.15
Nodes (12): LearningSummary(), Goal, GOAL_STATUS, MonthlyLetter(), NEXT_STATUS, ReportData, SENTIMENT, TONE (+4 more)

### Community 100 - "Community 100"
Cohesion: 0.15
Nodes (15): AiCoachDrawer(), ApiError, clampPos(), formatTime(), Message, SUGGESTED, TOOL_LABELS, useIsMobile() (+7 more)

### Community 101 - "Community 101"
Cohesion: 0.22
Nodes (14): aggregateExposure(), AggregateFreezeInput, aggregateFreezeSignal, CorrelationResult, Direction, OpenPosition, SymbolExposure, asDrawdownModel() (+6 more)

### Community 133 - "Community 133"
Cohesion: 0.16
Nodes (15): PREDEFINED_IDS, isValidSelection(), num(), parsePaletteConfig(), parsePaletteConfigJson(), configInput, customPalettesRouter, normalize() (+7 more)

### Community 134 - "Community 134"
Cohesion: 0.11
Nodes (18): devDependencies, eslint, eslint-config-next, jsdom, @playwright/test, react-email, tailwindcss, @tailwindcss/postcss (+10 more)

### Community 135 - "Community 135"
Cohesion: 0.12
Nodes (6): AI_PROVIDERS, COLORBLIND_OPTIONS, PerfilPage(), SESSIONS, TIMEZONES, SUPPORTED_CURRENCIES

### Community 136 - "Community 136"
Cohesion: 0.17
Nodes (13): AccountRiskConfig, DerivedRiskInputs, deriveRiskInputs(), median(), pctToFraction(), DrawdownModel, AccountPhase, adviseWithdrawal() (+5 more)

### Community 137 - "Community 137"
Cohesion: 0.23
Nodes (14): accentContrastFor(), clamp01(), contrastRatio(), derivePalette(), hexToRgb(), linearToSrgb(), okl(), oklchToHex() (+6 more)

### Community 138 - "Community 138"
Cohesion: 0.20
Nodes (11): EmotionInsight(), LABELS, EmotionFeedback, EmotionStat, EmotionTrade, feedbackForEmotion(), needsEmotionNudge(), round1() (+3 more)

### Community 139 - "Community 139"
Cohesion: 0.18
Nodes (13): hasVerifier(), METRIC_KEYS, OFF_PLAN_TAGS, REGISTRY, sortByDateTime(), Verifier, VerifierOpts, VerifierResult (+5 more)

### Community 140 - "Community 140"
Cohesion: 0.22
Nodes (11): buildLearningDigest(), daysBetween(), DigestInput, DigestReview, formatDateLabel(), isoDate(), ReviewKind, computeNewStreak() (+3 more)

### Community 141 - "Community 141"
Cohesion: 0.27
Nodes (14): applyColorTheme(), clearInlineTokens(), injectInline(), LEGACY_KEYS, LEGACY_VARS, reapplyCustomForMode(), tokensToCssText(), derivePalette() (+6 more)

### Community 142 - "Community 142"
Cohesion: 0.22
Nodes (10): POST(), recomputeInsightsForAll(), DetectedPattern, detectPatterns(), EpisodeForPattern, PATTERN_TEXT, PatternStatus, recordImprovementSnapshotForAll() (+2 more)

### Community 143 - "Community 143"
Cohesion: 0.21
Nodes (11): Band, jeffreysBand(), Bottleneck, mean(), PassOutcome, percentile(), projectPhasePass(), PropProjectionInput (+3 more)

### Community 144 - "Community 144"
Cohesion: 0.19
Nodes (14): BG, chunk(), clamp(), crc32(), __dirname, distSeg(), DOT, encodePNG() (+6 more)

### Community 145 - "Community 145"
Cohesion: 0.18
Nodes (12): Bead, BEADS, buildChart(), fmtWeek(), HOVER, money(), Overview, STAT (+4 more)

### Community 146 - "Community 146"
Cohesion: 0.25
Nodes (12): ToastCard(), ToastCardProps, TypeStyle, NotifType, Priority, ResolvedAction, DURATION, haptic() (+4 more)

### Community 147 - "Community 147"
Cohesion: 0.21
Nodes (9): CacheDb, CacheDelegate, CacheRow, getCachedStats(), invalidateCache(), isCacheEnabled(), setCachedStats(), CacheRow (+1 more)

### Community 148 - "Community 148"
Cohesion: 0.21
Nodes (11): ReviewEmailModel, AnalysisBlock(), deLatex(), EMAIL_CALLOUT, eyebrow(), gradeColors(), previewModel, renderInline() (+3 more)

### Community 149 - "Community 149"
Cohesion: 0.26
Nodes (10): block(), canEnforce(), proposeRuleForCommitment(), RuleSuggestionProposal, suggestRuleForInsight(), acceptRuleSuggestion(), createRuleFromProposal(), dismissRuleSuggestion() (+2 more)

### Community 150 - "Community 150"
Cohesion: 0.30
Nodes (11): BASE, decayedSalience(), initialSalience(), MemoryEventType, recallScore(), EpisodeRow, getSalientEpisodes(), rankBySalience() (+3 more)

### Community 151 - "Community 151"
Cohesion: 0.15
Nodes (13): Hito 2026-06-05: AI config, migraciones y consolidación documental, Hitos sin fecha explícita (Sprints 4-8, 1-3, Phase 0-1): fundación, tests/a11y, formula engine, RLS/auth, aprendizaje SRS, Hito 2026-06-10: Hardening P&L, enforcement, CI/migraciones y rendimiento (PRs #6-#17), Hito 2026-06-04 (Sprints 9-12): Portfolio MVP, PWA, PDF, Onboarding, Hito 2026-06-03: Stabilization Sprint — remediación QA manual (21 hallazgos P0), Subsistema: resolución de configuración IA (provider+modelo+key por usuario), Subsistema: CI/CD + migraciones Supabase, Subsistema: enforcement de reglas / locks prop-firm / drawdown (+5 more)

### Community 152 - "Community 152"
Cohesion: 0.17
Nodes (11): AiModelsCard(), ALL_TOOL_MODELS, COST_OPTIONS, FEATURE_LABEL, inputStyle, looksToolIncapable(), Provider, PROVIDER_LABEL (+3 more)

### Community 153 - "Community 153"
Cohesion: 0.17
Nodes (10): ACTION_LABEL, ActionList(), ALL, TAG_ACTIONS, ACTION_TYPES, ActionDeps, ActionResult, Handler (+2 more)

### Community 154 - "Community 154"
Cohesion: 0.19
Nodes (12): AccountRules, ADDABLE_TYPES, AddableType, CONTRACTS_TYPES, EVENT_COLORS, EVENT_DESCRIPTIONS, EVENT_LABELS, EventType (+4 more)

### Community 155 - "Community 155"
Cohesion: 0.23
Nodes (11): clamp01(), computeImprovementScore(), costOfIndiscipline(), DEFAULT_WEIGHTS, Driver, ImprovementInputs, ImprovementWeights, IndisciplineCost (+3 more)

### Community 156 - "Community 156"
Cohesion: 0.28
Nodes (11): analyticRiskOfRuin(), AnalyticRuinInput, mean(), monteCarloRiskOfRuin(), MonteCarloRuinInput, mulberry32(), riskOfRuin(), RiskOfRuinInput (+3 more)

### Community 157 - "Community 157"
Cohesion: 0.24
Nodes (11): canCommit(), CommitmentSpec, CommitmentStatus, Comparator, deriveCommitmentSpec(), evaluateResult(), INSIGHT_SPECS, partialBand() (+3 more)

### Community 158 - "Community 158"
Cohesion: 0.29
Nodes (8): invalidateAnalyticsCacheIfNeeded(), isValidIanaTimezone(), normalizeProfileInput(), PROFILE_PUBLIC_FIELDS, UpdateProfileInput, validateProfileUpdate(), createAdminClient(), profileRouter

### Community 159 - "Community 159"
Cohesion: 0.23
Nodes (9): CYCLE, getSystemTheme(), ResolvedTheme, resolveTheme(), ThemeContext, ThemeContextValue, ThemeMode, ThemeProvider() (+1 more)

### Community 160 - "Community 160"
Cohesion: 0.29
Nodes (9): resolveTheme(), getPredefined(), PREDEFINED_PALETTES, PredefinedPalette, PaletteConfig, accentHex(), hx(), resolveEmailThemeFor() (+1 more)

### Community 161 - "Community 161"
Cohesion: 0.27
Nodes (9): Lang, emitNotification(), EmitOptions, inQuietHours(), localHHMM(), passesPreferences(), PrefRow, RANK (+1 more)

### Community 162 - "Community 162"
Cohesion: 0.17
Nodes (11): background_color, categories, description, display, icons, name, orientation, short_name (+3 more)

### Community 163 - "Community 163"
Cohesion: 0.42
Nodes (9): calmarRatio(), computeRiskRatios(), Kelly, kellyCriterion(), kellyFromR, mean(), rollingRiskRatios(), sortinoRatio() (+1 more)

### Community 164 - "Community 164"
Cohesion: 0.18
Nodes (11): scripts, build, dev, e2e, e2e:ui, email, gen:theme, lint (+3 more)

### Community 165 - "Community 165"
Cohesion: 0.20
Nodes (10): Convención de proyecto: usar graphify (query/path/explain/update) antes de grep/browsing crudo, docs/ARCHITECTURE.md — arquitectura canónica (freeze v3.1 + ADRs), docs/auditoria-producto-trading-journal-v2.md — auditoría vinculante que originó v3 (anexo), docs/CHANGELOG.md — historial por hito (anexo), Invariantes: bloqueo pre-trade, separación práctica/real, frontera anti-envenenamiento, honestidad estadística, permiso, Trading Journal — capa cognitiva sobre el bróker, docs/PROJECT_GUIDE.md — léeme primero: qué es, módulos, stack, mapa de código, Cómo iniciar el proyecto: clonar, .nvmrc, pnpm install, .env, prisma generate, supabase db push, pnpm dev (+2 more)

### Community 166 - "Community 166"
Cohesion: 0.27
Nodes (9): ADV_ROLES, iconBtn, labelStyle, PaletteStudio(), NOTE: applying the theme on mount / mode-change is intentionally NOT done here., Swatch(), tileBtn(), useTheme() (+1 more)

### Community 167 - "Community 167"
Cohesion: 0.27
Nodes (7): detectSetupDrift(), DriftDimension, DriftDimensionKey, DriftInput, DriftTrade, mean(), SetupDefinition

### Community 169 - "Community 169"
Cohesion: 0.44
Nodes (5): LoginPage(), useLogout(), clearSessionStorageKeys(), SESSION_SCOPED_STORAGE_KEYS, createClient()

### Community 170 - "Community 170"
Cohesion: 0.31
Nodes (7): clamp01(), computeRiskBudget(), DailyWindow, DailyWindowInput, resolveDailyWindow(), RiskBudgetInput, RiskOverview

### Community 172 - "Community 172"
Cohesion: 0.22
Nodes (8): engines, node, name, packageManager, pnpm, onlyBuiltDependencies, private, version

### Community 173 - "Community 173"
Cohesion: 0.36
Nodes (5): AiInsightsPanel(), CAT_ICON, InsightCards(), sevStyle(), IntelligencePanel()

### Community 174 - "Community 174"
Cohesion: 0.39
Nodes (4): NoteTagSuggestions(), RULES, suggestTagsFromNote(), TagRule

### Community 175 - "Community 175"
Cohesion: 0.36
Nodes (5): analyzeMaeMfe(), EMPTY, MaeMfeResult, MaeMfeTrade, mean()

### Community 176 - "Community 176"
Cohesion: 0.39
Nodes (5): calcNextReviewAt(), computeProgressPct(), computeResourceStatus(), applyStudyFinish(), TODAY

### Community 179 - "Community 179"
Cohesion: 0.43
Nodes (5): AccountRiskPanel(), asPct(), BOTTLENECK, pct(), RiskBudgetMeter()

### Community 180 - "Community 180"
Cohesion: 0.43
Nodes (5): analyzeBenchmark(), BenchmarkResult, BenchmarkSetupRow, weightedComparison(), rows

### Community 181 - "Community 181"
Cohesion: 0.38
Nodes (5): CommitmentResult, planReinforcement(), positiveIsVisible(), ReinforcementKind, ReinforcementPlan

### Community 182 - "Community 182"
Cohesion: 0.38
Nodes (3): detectDecayedResources(), ResourceForDecay, today

### Community 183 - "Community 183"
Cohesion: 0.33
Nodes (5): apiKey, c, decryptApiKey(), EMBED_MODEL, encKey()

### Community 184 - "Community 184"
Cohesion: 0.33
Nodes (5): apiKey, c, decryptApiKey(), EMBED_MODEL, encKey()

### Community 185 - "Community 185"
Cohesion: 0.40
Nodes (4): buildPnlHeatmap(), DailyPnl, HeatmapDay, HeatmapResult

### Community 186 - "Community 186"
Cohesion: 0.33
Nodes (3): config, LogOptions, PrismaClientConstructor

### Community 195 - "Community 195"
Cohesion: 0.47
Nodes (4): getLoadState(), getObjectLoadState(), LoadState, QueryLike

### Community 196 - "Community 196"
Cohesion: 0.40
Nodes (5): ADR-002 — Estrategia estadística, D15 — estadística Bayesiana/jerárquica con shrinkage (irreversible como método; priors reversibles), D16 — proyecciones prop son no estacionarias, D17 — causalidad etiquetada honestamente, D18 — régimen v3

### Community 197 - "Community 197"
Cohesion: 0.50
Nodes (3): BudgetGuardInput, BudgetGuardResult, evaluateBudgetGuard()

### Community 217 - "Community 217"
Cohesion: 0.50
Nodes (4): BASE_ACCOUNT, BASE_CREATE_INPUT, buildCreateCaller(), makeTrade()

### Community 218 - "Community 218"
Cohesion: 0.40
Nodes (3): BASE_USER, mockDeleteUser, mockSupabase

### Community 219 - "Community 219"
Cohesion: 0.50
Nodes (3): sendEmail(), sendPropFirmHealthAlert(), supabase

### Community 220 - "Community 220"
Cohesion: 0.50
Nodes (4): CI job: checks (type check, tests, build), CI job: authenticated E2E (Playwright), CI job: migrate-deploy (apply migrations to production), CI job: migrate-validate (replay from scratch)

### Community 221 - "Community 221"
Cohesion: 0.50
Nodes (4): ADR-003 — Privacidad de la memoria y frontera anti-corrupción, D10 — Context Assembler con presupuesto, D11 — write con confirmación explícita, D9 — frontera anti-poisoning (irreversible)

### Community 222 - "Community 222"
Cohesion: 0.50
Nodes (4): E13 — MemoryEpisode (episódica, append-only, embedding, saliencia), Memory (subsistema: 4 capas + context assembler), P6 — El LLM propone, los datos confirman, P8 — Privacidad y autonomía como diseño, no como add-on

### Community 223 - "Community 223"
Cohesion: 0.50
Nodes (4): Módulo Dashboard (/dashboard), Módulo Playbook / Setups (/playbook), Superficies ANALIZAR/PROTEGER/MEJORAR (flag tj.v3Shell), Apuesta A3: rutas reales de 5 superficies

### Community 225 - "Community 225"
Cohesion: 0.67
Nodes (3): reviewChipLabel(), ReviewItem(), ReviewKind

### Community 226 - "Community 226"
Cohesion: 0.50
Nodes (3): Deploy on Vercel, Getting Started, Learn More

### Community 229 - "Community 229"
Cohesion: 0.50
Nodes (3): buildCommand, framework, installCommand

### Community 230 - "Community 230"
Cohesion: 0.67
Nodes (3): Stack v3.2 (Next.js/tRPC/Prisma/Supabase/Vercel/pgvector), Ops pendiente: protección de contraseñas filtradas (Supabase Auth), TD-019: cliente Supabase por-request en contexto tRPC

## Knowledge Gaps
- **4350 isolated node(s):** `PALETTES`, `target`, `h`, `OPTS`, `VALID_PERIODS` (+4345 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **119 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PrismaClient` connect `Community 56` to `Community 186`, `Community 2`, `Community 55`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `cn()` connect `Community 8` to `Community 33`, `Community 99`, `Community 100`, `Community 38`, `Community 39`, `Community 72`, `Community 43`, `Community 46`, `Community 47`, `Community 48`, `Community 19`, `Community 20`, `Community 154`, `Community 59`, `Community 93`, `Community 95`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 53` to `Community 172`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `PALETTES`, `target`, `h` to the rest of the system?**
  _4388 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.005128205128205128 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.013333333333333334 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.014388489208633094 - nodes in this community are weakly interconnected._