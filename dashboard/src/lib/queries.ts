import { SupabaseClient } from '@supabase/supabase-js';
import type { Profile, Team, ActivityEvent, TeamStats, ProfileWithUsage, ProfileWithTeam, MonthKey } from './types';
import { ACTIVITY_KEYS } from './types';

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
  const members = await getTeamMembers(supabase, teamId);
  const events = await getTeamEvents(supabase, teamId, monthKey);
  return attachUsageCounts(members, events);
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
  const [teams, allProfiles, allEvents] = await Promise.all([
    getAllTeams(supabase),
    supabase.from('profiles').select('id, team_id'),
    supabase
      .from('activity_events')
      .select('user_id, model_id, app, features')
      .eq('month_key', monthKey),
  ]);

  const profiles = allProfiles.data || [];
  const events = allEvents.data || [];

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
  const featureKeySet = new Set<string>(ACTIVITY_KEYS.filter(a => a.key !== 'chat').map(a => a.key));

  for (const p of profiles) {
    if (!p.team_id) continue;
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
      activityMap[teamId] = Object.fromEntries(ACTIVITY_KEYS.map(({ key }) => [key, 0]));
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
