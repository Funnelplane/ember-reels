'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

const NAV = [
  { icon: '⚡', label: 'Generate', href: '/' },
  { icon: '📁', label: 'Script Library', href: '/library' },
  { icon: '📅', label: 'Calendar', href: '/calendar' },
  { icon: '📊', label: 'Style Profile', href: '/profile' },
  { icon: '⚙️', label: 'Settings', href: '/settings' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] bg-[#0D0D0D] border-r border-[#1E1E1E] flex flex-col z-50">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-[#1E1E1E]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#F59E0B] flex items-center justify-center">
            <span className="text-black text-xs font-bold">ER</span>
          </div>
          <span className="font-display text-xl tracking-widest text-[#F5F5F0]">EMBER</span>
        </div>
        <p className="text-[10px] text-[#6B6B6B] tracking-widest mt-1 uppercase">Reel Script Engine</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.97 }}
                className={`flex items-center gap-3 px-3 py-2.5 mb-1 transition-all duration-150 cursor-pointer ${
                  active
                    ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-l-2 border-[#F59E0B]'
                    : 'text-[#6B6B6B] hover:text-[#F5F5F0] hover:bg-[#141414] border-l-2 border-transparent'
                }`}
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                <span className="text-sm font-medium tracking-wide">{item.label}</span>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-[#1E1E1E]">
        <p className="text-[10px] text-[#3A3A3A] tracking-widest uppercase">v1.0.0</p>
      </div>
    </aside>
  );
}
