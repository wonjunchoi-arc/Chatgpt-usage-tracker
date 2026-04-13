# Graph Report - .  (2026-04-13)

## Corpus Check
- Corpus is ~15,141 words - fits in a single context window. You may not need a graph.

## Summary
- 185 nodes · 259 edges · 42 communities detected
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.85)
- Token cost: 1,200 input · 650 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Activity Tracking Engine|Activity Tracking Engine]]
- [[_COMMUNITY_Supabase Data Layer|Supabase Data Layer]]
- [[_COMMUNITY_ChatGPT Payload Classification|ChatGPT Payload Classification]]
- [[_COMMUNITY_Dashboard Query Layer|Dashboard Query Layer]]
- [[_COMMUNITY_Extension & Dashboard Integration|Extension & Dashboard Integration]]
- [[_COMMUNITY_Extension Options UI|Extension Options UI]]
- [[_COMMUNITY_Dashboard Static Assets|Dashboard Static Assets]]
- [[_COMMUNITY_Admin Team Management|Admin Team Management]]
- [[_COMMUNITY_Extension Visual Identity|Extension Visual Identity]]
- [[_COMMUNITY_Dashboard Type Definitions|Dashboard Type Definitions]]
- [[_COMMUNITY_Development Tooling|Development Tooling]]
- [[_COMMUNITY_Entry Point|Entry Point]]
- [[_COMMUNITY_Extension Popup UI|Extension Popup UI]]
- [[_COMMUNITY_Auth Middleware|Auth Middleware]]
- [[_COMMUNITY_Usage Summary Component|Usage Summary Component]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]

## God Nodes (most connected - your core abstractions)
1. `ChatGPT Web Payload Analysis Guide` - 13 edges
2. `inferActivity()` - 11 edges
3. `buildDashboardData()` - 8 edges
4. `ensureValidSession()` - 7 edges
5. `Project Philosophy - ChatGPT Usage Tracker` - 7 edges
6. `normalizePlan()` - 6 edges
7. `fetchQuotaAll()` - 6 edges
8. `cleanupOldTimestamps()` - 6 edges
9. `sbStorageSet()` - 6 edges
10. `refreshSession()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Next.js Dashboard Application` --calls--> `Supabase Backend (DB + Client)`  [INFERRED]
  dashboard/README.md → docs/PHILOSOPHY.md
- `AX Transformation Measurement Goal` --conceptually_related_to--> `ChatGPT Web Payload Analysis Guide`  [INFERRED]
  docs/PHILOSOPHY.md → docs/chatgpt_web_payload_analysis.md
- `Network Intercept Data Flow (background.js → Supabase → Dashboard)` --references--> `Next.js Dashboard Application`  [EXTRACTED]
  docs/PHILOSOPHY.md → dashboard/README.md
- `Admin Dashboard Component (Next.js)` --references--> `Next.js Dashboard Application`  [EXTRACTED]
  docs/PHILOSOPHY.md → dashboard/README.md
- `Dashboard AGENTS.md - Next.js Agent Rules` --references--> `Next.js Dashboard Application`  [EXTRACTED]
  dashboard/AGENTS.md → dashboard/README.md

## Hyperedges (group relationships)
- **ChatGPT Network Intercept Data Pipeline** — background_js, supabase_backend, nextjs_dashboard_app [EXTRACTED 1.00]
- **Payload Feature Classification Ruleset** — payload_field_system_hints, payload_field_conversation_mode, payload_field_attachments, payload_classification_priority [EXTRACTED 1.00]
- **Privacy-First Structural Signal Design Principles** — philosophy_privacy_first, philosophy_structural_signal, payload_storage_strategy [INFERRED 0.85]
- **Extension Icon Set (16, 48, 128px)** — icon16_extension_icon, icon48_extension_icon, icon128_extension_icon [INFERRED 0.90]
- **Dashboard Public SVG Assets** — svg_window, svg_globe, svg_next, svg_file, svg_vercel [INFERRED 0.85]

## Communities

### Community 0 - "Activity Tracking Engine"
Cohesion: 0.13
Nodes (33): appendActivityEvent(), applyFeatureSignal(), asArray(), buildActivityDashboard(), buildDashboardData(), cleanupOldTimestamps(), collectAttachments(), collectConnectorIds() (+25 more)

### Community 1 - "Supabase Data Layer"
Cohesion: 0.23
Nodes (21): appendToSyncQueue(), clearSession(), ensureValidSession(), fetchTeams(), flushSyncQueue(), getSession(), getSyncStatus(), getUserProfile() (+13 more)

### Community 2 - "ChatGPT Payload Classification"
Cohesion: 0.16
Nodes (18): ChatGPT Web Payload Analysis Guide, Canvas Feature Classification Rule, Feature Classification Priority Order, Connector App Classification Rule, Conversation Request Payload (Core Signal), attachments Payload Field, conversation_mode Payload Field, ecosystemMention Symbol (custom_symbol_offsets) (+10 more)

### Community 3 - "Dashboard Query Layer"
Cohesion: 0.2
Nodes (7): attachUsageCounts(), getAllTeams(), getAllTeamsWithAdminStats(), getAllTeamsWithStats(), getTeamEvents(), getTeamMembers(), getTeamMembersWithUsage()

### Community 4 - "Extension & Dashboard Integration"
Cohesion: 0.22
Nodes (14): background.js (Network Interceptor), Dashboard AGENTS.md - Next.js Agent Rules, Dashboard CLAUDE.md, Dashboard Next.js Project README, Next.js Dashboard Application, Activity Event Storage Strategy (app + features), AX Transformation Measurement Goal, Chrome Extension Component (chatgpt-usage-limit-tracker/) (+6 more)

### Community 5 - "Extension Options UI"
Cohesion: 0.39
Nodes (5): formatTime(), renderAuthState(), renderSyncState(), renderTeamState(), showError()

### Community 6 - "Dashboard Static Assets"
Cohesion: 0.4
Nodes (6): Dashboard Next.js Application, File / Document SVG Icon, Globe SVG Icon, Next.js Wordmark SVG, Vercel Triangle Logo SVG, Window SVG Icon

### Community 7 - "Admin Team Management"
Cohesion: 0.4
Nodes (0): 

### Community 8 - "Extension Visual Identity"
Cohesion: 0.7
Nodes (5): ChatGPT Usage Limit Tracker Chrome Extension, Hourglass / Timer Visual Motif, Extension Icon 128x128, Extension Icon 16x16, Extension Icon 48x48

### Community 9 - "Dashboard Type Definitions"
Cohesion: 0.67
Nodes (0): 

### Community 10 - "Development Tooling"
Cohesion: 1.0
Nodes (3): tmux 'claude' Named Session Pattern, tmux Usage Guide, tmux Session Management (new/attach/kill)

### Community 11 - "Entry Point"
Cohesion: 1.0
Nodes (0): 

### Community 12 - "Extension Popup UI"
Cohesion: 1.0
Nodes (0): 

### Community 13 - "Auth Middleware"
Cohesion: 1.0
Nodes (0): 

### Community 14 - "Usage Summary Component"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "Community 15"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Community 16"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Community 18"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (1): ChatGPT Usage Limit Tracker (Root README)

## Knowledge Gaps
- **11 isolated node(s):** `ChatGPT Usage Limit Tracker (Root README)`, `Dashboard Next.js Project README`, `Dashboard CLAUDE.md`, `Conversation Request Payload (Core Signal)`, `Plain Chat Classification Rule` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Entry Point`** (2 nodes): `main()`, `main.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Extension Popup UI`** (2 nodes): `popup.js`, `initPanel()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auth Middleware`** (2 nodes): `middleware.ts`, `middleware()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Usage Summary Component`** (2 nodes): `UsageSummaryCards.tsx`, `UsageSummaryCards()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (2 nodes): `TeamsCompareChart.tsx`, `getActivityLabel()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (2 nodes): `ActivityCountCards()`, `ActivityCountCards.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (2 nodes): `ActivityTimeline()`, `ActivityTimeline.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (2 nodes): `TimeRangeFilter.tsx`, `TimeRangeFilter()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (2 nodes): `TeamSelector.tsx`, `TeamSelector()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (2 nodes): `Sidebar.tsx`, `handleSignOut()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (2 nodes): `layout.tsx`, `RootLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (2 nodes): `page.tsx`, `Home()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (2 nodes): `page.tsx`, `handleSubmit()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (2 nodes): `layout.tsx`, `DashboardLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (2 nodes): `page.tsx`, `DashboardPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (2 nodes): `page.tsx`, `TeamPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (2 nodes): `page.tsx`, `ComparePage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (2 nodes): `server.ts`, `createClient()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (2 nodes): `createClient()`, `client.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (1 nodes): `next.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (1 nodes): `next-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (1 nodes): `ActivityBreakdownChart.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (1 nodes): `LowUsageMembersCard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (1 nodes): `AppTypeChart.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `UserTable.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `FeatureUsageChart.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `ModelDistributionChart.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `ActivitySummaryBarChart.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (1 nodes): `ChatGPT Usage Limit Tracker (Root README)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ChatGPT Web Payload Analysis Guide` connect `ChatGPT Payload Classification` to `Extension & Dashboard Integration`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `Project Philosophy - ChatGPT Usage Tracker` connect `Extension & Dashboard Integration` to `ChatGPT Payload Classification`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `Structural Signal Priority Principle` connect `ChatGPT Payload Classification` to `Extension & Dashboard Integration`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `ChatGPT Web Payload Analysis Guide` (e.g. with `Structural Signal Priority Principle` and `AX Transformation Measurement Goal`) actually correct?**
  _`ChatGPT Web Payload Analysis Guide` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ChatGPT Usage Limit Tracker (Root README)`, `Dashboard Next.js Project README`, `Dashboard CLAUDE.md` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Activity Tracking Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._