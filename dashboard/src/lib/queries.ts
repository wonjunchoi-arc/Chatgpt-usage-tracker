import { SupabaseClient } from '@supabase/supabase-js';
import type { Profile, Team, ActivityEvent, TeamStats, ProfileWithUsage, ProfileWithTeam, MonthKey } from './types';
import { ACTIVITY_KEYS } from './types';

interface MonthlyUsageSummaryRow {
  user_id: string;
  model_id: string;
  usage_count: number;
}

interface MonthlyAppSummaryRow {
  user_id: string;
  app: string;
  usage_count: number;
}

interface MonthlyFeatureSummaryRow {
  user_id: string;
  feature: string;
  usage_count: number;
}

export interface DashboardSummary {
  totalEvents: number;
  modelCounts: Record<string, number>;
  appCounts: Record<string, number>;
  featureCounts: Record<string, number>;
  activityCounts: Record<string, number>;
}

export async function getProfile(supabase: SupabaseClient, userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id, email, display_name, team_id, role, created_at')
    .eq('id', userId)
    .single();
  return data;
}

export async function getAllTeams(supabase: SupabaseClient): Promise<Team[]> {
  const { data } = await supabase
    .from('teams')
    .select('id, name, created_at')
    .order('name');
  return data || [];
}

export async function getTeamMembers(supabase: SupabaseClient, teamId: string): Promise<Profile[]> {
  const { data } = await supabase
    .from('profiles')
    .select('id, email, display_name, team_id, role, created_at')
    .eq('team_id', teamId)
    .order('display_name', { ascending: true, nullsFirst: false })
    .order('email');
  return data || [];
}

export async function getAllProfilesWithTeams(supabase: SupabaseClient): Promise<ProfileWithTeam[]> {
  const [{ data: profiles }, teams] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, display_name, team_id, role, created_at')
      .order('created_at', { ascending: false }),
    getAllTeams(supabase),
  ]);

  const teamMap = Object.fromEntries(teams.map(team => [team.id, team.name]));

  return (profiles || []).map(profile => ({
    ...profile,
    team_name: profile.team_id ? teamMap[profile.team_id] || null : null,
  }));
}

export async function getTeamEvents(
  supabase: SupabaseClient,
  teamId: string,
  monthKey: MonthKey
): Promise<ActivityEvent[]> {
  const { data: members } = await supabase
    .from('profiles')
    .select('id')
    .eq('team_id', teamId);

  if (!members || !members.length) return [];

  const memberIds = members.map(m => m.id);

  const { data } = await supabase
    .from('activity_events')
    .select('*')
    .in('user_id', memberIds)
    .eq('month_key', monthKey)
    .order('server_ts', { ascending: false })
    .limit(5000);

  return data || [];
}

export async function getUserEvents(
  supabase: SupabaseClient,
  userId: string,
  monthKey: MonthKey
): Promise<ActivityEvent[]> {
  const { data } = await supabase
    .from('activity_events')
    .select('*')
    .eq('user_id', userId)
    .eq('month_key', monthKey)
    .order('server_ts', { ascending: false })
    .limit(5000);

  return data || [];
}

function createEmptyActivityCounts() {
  return Object.fromEntries(ACTIVITY_KEYS.map(({ key }) => [key, 0])) as Record<string, number>;
}

function buildActivityCounts(
  appCounts: Record<string, number>,
  featureCounts: Record<string, number>
): Record<string, number> {
  const activityCounts = createEmptyActivityCounts();
  activityCounts.chat = appCounts.chat || 0;

  for (const { key } of ACTIVITY_KEYS) {
    if (key === 'chat') continue;
    activityCounts[key] = featureCounts[key] || 0;
  }

  return activityCounts;
}

function buildDashboardSummary(
  usageRows: MonthlyUsageSummaryRow[],
  appRows: MonthlyAppSummaryRow[],
  featureRows: MonthlyFeatureSummaryRow[]
): DashboardSummary {
  const modelCounts: Record<string, number> = {};
  const appCounts: Record<string, number> = {};
  const featureCounts: Record<string, number> = {};

  for (const row of usageRows) {
    modelCounts[row.model_id] = (modelCounts[row.model_id] || 0) + row.usage_count;
  }

  for (const row of appRows) {
    appCounts[row.app] = (appCounts[row.app] || 0) + row.usage_count;
  }

  for (const row of featureRows) {
    featureCounts[row.feature] = (featureCounts[row.feature] || 0) + row.usage_count;
  }

  return {
    totalEvents: usageRows.reduce((sum, row) => sum + row.usage_count, 0),
    modelCounts,
    appCounts,
    featureCounts,
    activityCounts: buildActivityCounts(appCounts, featureCounts),
  };
}

async function getMonthlyUsageRows(
  supabase: SupabaseClient,
  userIds: string[],
  monthKey: MonthKey
): Promise<MonthlyUsageSummaryRow[]> {
  if (!userIds.length) return [];

  const { data } = await supabase
    .from('monthly_usage_summary')
    .select('user_id, model_id, usage_count')
    .in('user_id', userIds)
    .eq('month_key', monthKey);

  return data || [];
}

async function getMonthlyAppRows(
  supabase: SupabaseClient,
  userIds: string[],
  monthKey: MonthKey
): Promise<MonthlyAppSummaryRow[]> {
  if (!userIds.length) return [];

  const { data } = await supabase
    .from('monthly_app_summary')
    .select('user_id, app, usage_count')
    .in('user_id', userIds)
    .eq('month_key', monthKey);

  return data || [];
}

async function getMonthlyFeatureRows(
  supabase: SupabaseClient,
  userIds: string[],
  monthKey: MonthKey
): Promise<MonthlyFeatureSummaryRow[]> {
  if (!userIds.length) return [];

  const { data } = await supabase
    .from('monthly_feature_summary')
    .select('user_id, feature, usage_count')
    .in('user_id', userIds)
    .eq('month_key', monthKey);

  return data || [];
}

export async function getUserDashboardSummary(
  supabase: SupabaseClient,
  userId: string,
  monthKey: MonthKey
): Promise<DashboardSummary> {
  const [usageRows, appRows, featureRows] = await Promise.all([
    getMonthlyUsageRows(supabase, [userId], monthKey),
    getMonthlyAppRows(supabase, [userId], monthKey),
    getMonthlyFeatureRows(supabase, [userId], monthKey),
  ]);

  if (!usageRows.length && !appRows.length && !featureRows.length) {
    const rawStats = aggregateStats(await getUserEvents(supabase, userId, monthKey));
    return {
      totalEvents: rawStats.totalEvents,
      modelCounts: rawStats.modelCounts,
      appCounts: rawStats.appCounts,
      featureCounts: rawStats.featureCounts,
      activityCounts: rawStats.activityCounts,
    };
  }

  return buildDashboardSummary(usageRows, appRows, featureRows);
}

export async function getTeamDashboardSummary(
  supabase: SupabaseClient,
  teamId: string,
  monthKey: MonthKey
): Promise<DashboardSummary> {
  const members = await getTeamMembers(supabase, teamId);
  const memberIds = members.map(member => member.id);
  const [usageRows, appRows, featureRows] = await Promise.all([
    getMonthlyUsageRows(supabase, memberIds, monthKey),
    getMonthlyAppRows(supabase, memberIds, monthKey),
    getMonthlyFeatureRows(supabase, memberIds, monthKey),
  ]);

  if (!usageRows.length && !appRows.length && !featureRows.length) {
    const rawStats = aggregateStats(await getTeamEvents(supabase, teamId, monthKey));
    return {
      totalEvents: rawStats.totalEvents,
      modelCounts: rawStats.modelCounts,
      appCounts: rawStats.appCounts,
      featureCounts: rawStats.featureCounts,
      activityCounts: rawStats.activityCounts,
    };
  }

  return buildDashboardSummary(usageRows, appRows, featureRows);
}

export async function getTeamMembersWithSummaryUsage(
  supabase: SupabaseClient,
  teamId: string,
  monthKey: MonthKey
): Promise<ProfileWithUsage[]> {
  const members = await getTeamMembers(supabase, teamId);
  const usageRows = await getMonthlyUsageRows(
    supabase,
    members.map(member => member.id),
    monthKey
  );

  if (!usageRows.length) {
    const rawEvents = await getTeamEvents(supabase, teamId, monthKey);
    return attachUsageCounts(members, rawEvents);
  }

  const countMap: Record<string, number> = {};
  for (const row of usageRows) {
    countMap[row.user_id] = (countMap[row.user_id] || 0) + row.usage_count;
  }

  return members.map(member => ({
    ...member,
    eventCount: countMap[member.id] || 0,
  }));
}

export async function getMemberSummaryOptions(
  supabase: SupabaseClient,
  teamId: string,
  monthKey: MonthKey
): Promise<Array<{ id: string; label: string; totalEvents: number; activityCounts: Record<string, number> }>> {
  const members = await getTeamMembers(supabase, teamId);
  const memberIds = members.map(member => member.id);
  const [usageRows, appRows, featureRows] = await Promise.all([
    getMonthlyUsageRows(supabase, memberIds, monthKey),
    getMonthlyAppRows(supabase, memberIds, monthKey),
    getMonthlyFeatureRows(supabase, memberIds, monthKey),
  ]);

  if (!usageRows.length && !appRows.length && !featureRows.length) {
    const rawEvents = await getTeamEvents(supabase, teamId, monthKey);
    const eventsByUser: Record<string, ActivityEvent[]> = {};

    for (const event of rawEvents) {
      if (!eventsByUser[event.user_id]) eventsByUser[event.user_id] = [];
      eventsByUser[event.user_id].push(event);
    }

    return members.map(member => {
      const rawStats = aggregateStats(eventsByUser[member.id] || []);
      return {
        id: member.id,
        label: member.display_name?.trim() || member.email,
        totalEvents: rawStats.totalEvents,
        activityCounts: rawStats.activityCounts,
      };
    });
  }

  const usageByUser: Record<string, MonthlyUsageSummaryRow[]> = {};
  const appByUser: Record<string, MonthlyAppSummaryRow[]> = {};
  const featureByUser: Record<string, MonthlyFeatureSummaryRow[]> = {};

  for (const row of usageRows) {
    if (!usageByUser[row.user_id]) usageByUser[row.user_id] = [];
    usageByUser[row.user_id].push(row);
  }

  for (const row of appRows) {
    if (!appByUser[row.user_id]) appByUser[row.user_id] = [];
    appByUser[row.user_id].push(row);
  }

  for (const row of featureRows) {
    if (!featureByUser[row.user_id]) featureByUser[row.user_id] = [];
    featureByUser[row.user_id].push(row);
  }

  return members.map(member => {
    const summary = buildDashboardSummary(
      usageByUser[member.id] || [],
      appByUser[member.id] || [],
      featureByUser[member.id] || [],
    );

    return {
      id: member.id,
      label: member.display_name?.trim() || member.email,
      totalEvents: summary.totalEvents,
      activityCounts: summary.activityCounts,
    };
  });
}

export function attachUsageCounts(
  members: Profile[],
  events: Pick<ActivityEvent, 'user_id'>[]
): ProfileWithUsage[] {
  const countMap: Record<string, number> = {};

  for (const event of events) {
    countMap[event.user_id] = (countMap[event.user_id] || 0) + 1;
  }

  return members.map(member => ({
    ...member,
    eventCount: countMap[member.id] || 0,
  }));
}

export function aggregateStats(events: ActivityEvent[]): TeamStats {
  const modelCounts: Record<string, number> = {};
  const appCounts: Record<string, number> = {};
  const featureCounts: Record<string, number> = {};
  const dailyMap: Record<string, number> = {};
  const dailyActivityMap: Record<string, Record<string, number>> = {};

  const featureKeySet = new Set<string>(ACTIVITY_KEYS.filter(a => a.key !== 'chat').map(a => a.key));

  for (const event of events) {
    modelCounts[event.model_id] = (modelCounts[event.model_id] || 0) + 1;
    appCounts[event.app] = (appCounts[event.app] || 0) + 1;

    for (const feature of event.features) {
      featureCounts[feature] = (featureCounts[feature] || 0) + 1;
    }

    const day = event.server_ts.slice(0, 10);
    dailyMap[day] = (dailyMap[day] || 0) + 1;

    if (!dailyActivityMap[day]) dailyActivityMap[day] = {};

    if (event.app === 'chat') {
      dailyActivityMap[day]['chat'] = (dailyActivityMap[day]['chat'] || 0) + 1;
    }
    for (const feature of event.features) {
      if (featureKeySet.has(feature)) {
        dailyActivityMap[day][feature] = (dailyActivityMap[day][feature] || 0) + 1;
      }
    }
  }

  const dailyEvents = Object.entries(dailyMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const dailyBreakdown = Object.entries(dailyActivityMap)
    .map(([date, counts]) => ({ date, ...counts }))
    .sort((a, b) => (a.date as string).localeCompare(b.date as string));

  const activityCounts: Record<string, number> = { chat: appCounts['chat'] || 0 };
  for (const { key } of ACTIVITY_KEYS) {
    if (key !== 'chat') activityCounts[key] = featureCounts[key] || 0;
  }

  return {
    totalEvents: events.length,
    modelCounts,
    appCounts,
    featureCounts,
    dailyEvents,
    activityCounts,
    dailyBreakdown,
  };
}

export async function getTeamMembersWithUsage(
  supabase: SupabaseClient,
  teamId: string,
  monthKey: MonthKey
): Promise<ProfileWithUsage[]> {
  return getTeamMembersWithSummaryUsage(supabase, teamId, monthKey);
}

export interface TeamWithStats extends Team {
  memberCount: number;
  activeMembers: number;
  eventCount: number;
  eventsPerMember: number;
  eventsPerActiveMember: number;
  topModel: string | null;
  activityCounts: Record<string, number>;
  topActivity: string | null;
  leastActivity: string | null;
}

export async function getAllTeamsWithStats(
  supabase: SupabaseClient,
  monthKey: MonthKey
): Promise<TeamWithStats[]> {
  const [teams, allProfiles, usageSummary, appSummary, featureSummary] = await Promise.all([
    getAllTeams(supabase),
    supabase.from('profiles').select('id, team_id'),
    supabase
      .from('monthly_usage_summary')
      .select('user_id, model_id, usage_count')
      .eq('month_key', monthKey),
    supabase
      .from('monthly_app_summary')
      .select('user_id, app, usage_count')
      .eq('month_key', monthKey),
    supabase
      .from('monthly_feature_summary')
      .select('user_id, feature, usage_count')
      .eq('month_key', monthKey),
  ]);

  const profiles = allProfiles.data || [];
  const usageRows = (usageSummary.data || []) as MonthlyUsageSummaryRow[];
  const appRows = (appSummary.data || []) as MonthlyAppSummaryRow[];
  const featureRows = (featureSummary.data || []) as MonthlyFeatureSummaryRow[];

  if (!usageRows.length && !appRows.length && !featureRows.length) {
    const { data: rawEvents } = await supabase
      .from('activity_events')
      .select('user_id, model_id, app, features')
      .eq('month_key', monthKey);

    const events = rawEvents || [];
    const userTeamMap: Record<string, string> = {};
    const memberMap: Record<string, Set<string>> = {};
    const activeMap: Record<string, Set<string>> = {};
    const eventCountMap: Record<string, number> = {};
    const modelMap: Record<string, Record<string, number>> = {};
    const activityMap: Record<string, Record<string, number>> = {};
    const featureKeySet = new Set<string>(ACTIVITY_KEYS.filter(a => a.key !== 'chat').map(a => a.key));

    for (const p of profiles) {
      if (!p.team_id) continue;
      userTeamMap[p.id] = p.team_id;
      if (!memberMap[p.team_id]) memberMap[p.team_id] = new Set();
      memberMap[p.team_id].add(p.id);
    }

    for (const e of events) {
      const teamId = userTeamMap[e.user_id];
      if (!teamId) continue;

      eventCountMap[teamId] = (eventCountMap[teamId] || 0) + 1;

      if (!activeMap[teamId]) activeMap[teamId] = new Set();
      activeMap[teamId].add(e.user_id);

      if (!modelMap[teamId]) modelMap[teamId] = {};
      modelMap[teamId][e.model_id] = (modelMap[teamId][e.model_id] || 0) + 1;

      if (!activityMap[teamId]) {
        activityMap[teamId] = createEmptyActivityCounts();
      }

      if (e.app === 'chat') {
        activityMap[teamId].chat = (activityMap[teamId].chat || 0) + 1;
      }

      for (const feature of e.features || []) {
        if (featureKeySet.has(feature)) {
          activityMap[teamId][feature] = (activityMap[teamId][feature] || 0) + 1;
        }
      }
    }

    return (teams || []).map(team => {
      const modelCounts = modelMap[team.id] || {};
      const activityCounts = activityMap[team.id] || createEmptyActivityCounts();
      const topModel = Object.entries(modelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      const sortedActivities = ACTIVITY_KEYS
        .map(({ key }) => [key, activityCounts[key] || 0] as const)
        .sort((a, b) => b[1] - a[1]);
      const topActivity = sortedActivities.find(([, count]) => count > 0)?.[0] ?? null;
      const leastActivity = [...sortedActivities].reverse()[0]?.[0] ?? null;
      const memberCount = memberMap[team.id]?.size ?? 0;
      const activeMembers = activeMap[team.id]?.size ?? 0;
      const eventCount = eventCountMap[team.id] ?? 0;

      return {
        ...team,
        memberCount,
        activeMembers,
        eventCount,
        eventsPerMember: memberCount ? Number((eventCount / memberCount).toFixed(1)) : 0,
        eventsPerActiveMember: activeMembers ? Number((eventCount / activeMembers).toFixed(1)) : 0,
        topModel,
        activityCounts,
        topActivity,
        leastActivity,
      };
    }).sort((a, b) => b.eventCount - a.eventCount);
  }

  // Map: userId -> teamId
  const userTeamMap: Record<string, string> = {};
  for (const p of profiles) {
    if (p.team_id) userTeamMap[p.id] = p.team_id;
  }

  // Aggregate per team
  const memberMap: Record<string, Set<string>> = {};
  const activeMap: Record<string, Set<string>> = {};
  const eventCountMap: Record<string, number> = {};
  const modelMap: Record<string, Record<string, number>> = {};
  const activityMap: Record<string, Record<string, number>> = {};

  for (const p of profiles) {
    if (!p.team_id) continue;
    if (!memberMap[p.team_id]) memberMap[p.team_id] = new Set();
    memberMap[p.team_id].add(p.id);
  }

  for (const row of usageRows) {
    const teamId = userTeamMap[row.user_id];
    if (!teamId) continue;

    eventCountMap[teamId] = (eventCountMap[teamId] || 0) + row.usage_count;

    if (!activeMap[teamId]) activeMap[teamId] = new Set();
    activeMap[teamId].add(row.user_id);

    if (!modelMap[teamId]) modelMap[teamId] = {};
    modelMap[teamId][row.model_id] = (modelMap[teamId][row.model_id] || 0) + row.usage_count;
  }

  for (const row of appRows) {
    const teamId = userTeamMap[row.user_id];
    if (!teamId) continue;
    if (!activityMap[teamId]) {
      activityMap[teamId] = createEmptyActivityCounts();
    }
    if (row.app === 'chat') {
      activityMap[teamId].chat = (activityMap[teamId].chat || 0) + row.usage_count;
    }
  }

  for (const row of featureRows) {
    const teamId = userTeamMap[row.user_id];
    if (!teamId) continue;
    if (!activityMap[teamId]) {
      activityMap[teamId] = createEmptyActivityCounts();
    }
    if (row.feature in activityMap[teamId]) {
      activityMap[teamId][row.feature] = (activityMap[teamId][row.feature] || 0) + row.usage_count;
    }
  }

  return (teams || []).map(team => {
    const modelCounts = modelMap[team.id] || {};
    const activityCounts = activityMap[team.id] || Object.fromEntries(ACTIVITY_KEYS.map(({ key }) => [key, 0]));
    const topModel = Object.entries(modelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const sortedActivities = ACTIVITY_KEYS
      .map(({ key }) => [key, activityCounts[key] || 0] as const)
      .sort((a, b) => b[1] - a[1]);
    const topActivity = sortedActivities.find(([, count]) => count > 0)?.[0] ?? null;
    const leastActivity = [...sortedActivities].reverse()[0]?.[0] ?? null;
    const memberCount = memberMap[team.id]?.size ?? 0;
    const activeMembers = activeMap[team.id]?.size ?? 0;
    const eventCount = eventCountMap[team.id] ?? 0;

    return {
      ...team,
      memberCount,
      activeMembers,
      eventCount,
      eventsPerMember: memberCount ? Number((eventCount / memberCount).toFixed(1)) : 0,
      eventsPerActiveMember: activeMembers ? Number((eventCount / activeMembers).toFixed(1)) : 0,
      topModel,
      activityCounts,
      topActivity,
      leastActivity,
    };
  }).sort((a, b) => b.eventCount - a.eventCount);
}

export interface TeamAdminStats extends Team {
  memberCount: number;
  eventCount: number;
}

export async function getAllTeamsWithAdminStats(supabase: SupabaseClient): Promise<TeamAdminStats[]> {
  const [teams, allProfiles, allEvents] = await Promise.all([
    getAllTeams(supabase),
    supabase.from('profiles').select('id, team_id'),
    supabase.from('activity_events').select('user_id'),
  ]);

  const profiles = allProfiles.data || [];
  const events = allEvents.data || [];
  const userTeamMap: Record<string, string> = {};
  const memberCountMap: Record<string, number> = {};
  const eventCountMap: Record<string, number> = {};

  for (const profile of profiles) {
    if (!profile.team_id) continue;
    userTeamMap[profile.id] = profile.team_id;
    memberCountMap[profile.team_id] = (memberCountMap[profile.team_id] || 0) + 1;
  }

  for (const event of events) {
    const teamId = userTeamMap[event.user_id];
    if (!teamId) continue;
    eventCountMap[teamId] = (eventCountMap[teamId] || 0) + 1;
  }

  return teams.map(team => ({
    ...team,
    memberCount: memberCountMap[team.id] || 0,
    eventCount: eventCountMap[team.id] || 0,
  }));
}

export async function createTeam(supabase: SupabaseClient, name: string): Promise<Team | null> {
  const { data } = await supabase
    .from('teams')
    .insert({ name })
    .select()
    .single();
  return data;
}

export async function updateProfileByAdmin(
  supabase: SupabaseClient,
  id: string,
  updates: Pick<Profile, 'display_name' | 'team_id' | 'role'>
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
}

export async function deleteProfileByAdmin(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function updateTeam(supabase: SupabaseClient, id: string, name: string): Promise<void> {
  await supabase.from('teams').update({ name }).eq('id', id);
}

export async function deleteTeam(supabase: SupabaseClient, id: string): Promise<void> {
  await supabase.from('teams').delete().eq('id', id);
}
