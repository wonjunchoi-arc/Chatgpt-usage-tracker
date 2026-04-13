export interface Team {
  id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  team_id: string | null;
  role: 'member' | 'admin';
  created_at: string;
}

export interface ProfileWithTeam extends Profile {
  team_name: string | null;
}

export interface ActivityEvent {
  id: number;
  user_id: string;
  ts: number;
  server_ts: string;
  month_key: string;
  model_id: string;
  display_name: string | null;
  app: string;
  features: string[];
  attachment_count: number;
  attachment_mime_types: string[];
  attachment_sources: string[];
  image_count: number;
  tool_count: number;
  tool_names: string[];
  connector_ids: string[];
  connector_count: number;
  has_connector_mention: boolean;
  source_count: number;
  github_repo_count: number;
  selected_all_github_repos: boolean;
  system_hints: string[];
  conversation_mode: string | null;
  gizmo_id: string | null;
  thinking_effort: string | null;
  model_tier: string;
  path: string | null;
}

export const ACTIVITY_KEYS = [
  { key: 'chat',             label: '채팅',      color: '#10b981' },
  { key: 'file-analysis',    label: '파일첨부',   color: '#3b82f6' },
  { key: 'connector-app',    label: '앱 연결',    color: '#f59e0b' },
  { key: 'skill-invocation', label: '스킬',       color: '#8b5cf6' },
  { key: 'project-context',  label: '프로젝트',   color: '#ec4899' },
  { key: 'image-generation', label: '이미지 생성', color: '#ef4444' },
  { key: 'search',           label: '검색',       color: '#14b8a6' },
  { key: 'pro-model',        label: 'Pro 모델',   color: '#f97316' },
] as const;

export type ActivityKey = typeof ACTIVITY_KEYS[number]['key'];

export interface TeamStats {
  totalEvents: number;
  modelCounts: Record<string, number>;
  appCounts: Record<string, number>;
  featureCounts: Record<string, number>;
  dailyEvents: { date: string; count: number }[];
  activityCounts: Record<string, number>;
  dailyBreakdown: Array<Record<string, string | number>>;
}

export interface ProfileWithUsage extends Profile {
  eventCount: number;
  activityCounts: Record<string, number>;
}

export type MonthKey = `${number}-${string}`;

export function getCurrentMonthKey(date = new Date()): MonthKey {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit'
  });
  const parts = formatter.formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}` as MonthKey;
}

export function getProfileDisplayName(profile: Pick<Profile, 'display_name' | 'email'>): string {
  const name = profile.display_name?.trim();
  return name || profile.email;
}
