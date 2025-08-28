"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/app", label: "Dashboard" },
  { href: "/tools", label: "Tools" },
  { href: "/account", label: "Account" },
];

export default function AppSidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 shrink-0 border-r border-white/10 bg-black/60 min-h-screen sticky top-0">
      <div className="p-4 text-white font-semibold">Ecom Efficiency</div>
      <nav className="flex flex-col p-2 gap-1">
        {items.map((it) => {
          const active = pathname === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`px-3 py-2 rounded-md ${active ? 'bg-white/10 text-white' : 'text-gray-300 hover:text-white hover:bg-white/5'} transition-colors`}
            >
              {it.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}


