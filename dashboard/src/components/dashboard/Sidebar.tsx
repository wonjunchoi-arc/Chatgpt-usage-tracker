'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface SidebarProps {
  userLabel: string;
  teamName: string | null;
  isAdmin: boolean;
}

const navItems = [
  { href: '/dashboard/team', label: '팀 대시보드' },
  { href: '/dashboard/compare', label: '팀 비교' },
  { href: '/dashboard/admin', label: '전체 팀 목록' },
];

const adminItems = [
  { href: '/dashboard/admin/teams', label: '팀 관리' },
  { href: '/dashboard/admin/users', label: '사용자 관리' },
];

export default function Sidebar({ userLabel, teamName, isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="w-60 h-screen bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-5 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">ChatGPT 트래커</h2>
        {teamName && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{teamName}</p>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname.startsWith(item.href)
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {item.label}
          </Link>
        ))}

        <div className="pt-4 pb-2">
          <p className="px-3 text-xs font-semibold text-gray-400 uppercase">
            {isAdmin ? '관리자' : '관리'}
          </p>
        </div>
        {adminItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname === item.href
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-2">{userLabel}</p>
        <button
          onClick={handleSignOut}
          className="w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium"
        >
          로그아웃
        </button>
      </div>
    </aside>
  );
}
