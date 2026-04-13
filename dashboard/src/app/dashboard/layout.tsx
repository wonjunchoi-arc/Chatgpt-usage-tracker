import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/queries';
import Sidebar from '@/components/dashboard/Sidebar';
import { getProfileDisplayName } from '@/lib/types';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const profile = await getProfile(supabase, user.id);
  if (!profile) redirect('/login');

  let teamName: string | null = null;
  if (profile.team_id) {
    const { data: team } = await supabase
      .from('teams')
      .select('name')
      .eq('id', profile.team_id)
      .single();
    teamName = team?.name || null;
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar
        userLabel={getProfileDisplayName(profile)}
        teamName={teamName}
        isAdmin={profile.role === 'admin'}
      />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
