'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const NAV_LINKS = [
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/stats', label: 'City Stats' },
  { href: '/departments', label: 'Departments' },
  { href: '/nearby', label: 'Nearby Issues' },
  { href: '/contractors', label: 'Contractors' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200/60">
      <div className="mx-auto max-w-7xl px-4 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
            <span className="text-white text-lg">🏛️</span>
          </div>
          <div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">Nagrik Setu</span>
            <span className="hidden sm:block text-[9px] text-gray-500 -mt-0.5 font-medium tracking-wide">
              नागरिक सेतु — Smart Grievance Portal
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/staff"
            className="hidden sm:flex text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg font-medium border border-gray-200 transition-colors items-center gap-1.5"
          >
            <span className="text-[10px]">🔒</span> Staff
          </Link>
          <Link
            href="/login"
            className="hidden sm:block text-sm text-gray-700 hover:text-gray-900 font-medium px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-blue-800 shadow-sm hover:shadow-md transition-all"
          >
            Register
          </Link>
          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="md:hidden ml-1 p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white/95 backdrop-blur-lg">
          <nav className="px-4 py-3 space-y-1">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="border-t border-gray-100 pt-2 mt-2 flex items-center gap-2">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="text-sm text-gray-700 font-medium px-3 py-2 rounded-lg hover:bg-gray-50"
              >
                Sign in
              </Link>
              <Link
                href="/staff"
                onClick={() => setMobileOpen(false)}
                className="text-xs text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg font-medium border border-gray-200"
              >
                🔒 Staff
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

const FOOTER_LINKS = {
  'Quick Links': [
    { href: '/report', label: 'Report Issue' },
    { href: '/nearby', label: 'Nearby Issues' },
    { href: '/how-it-works', label: 'How It Works' },
    { href: '/stats', label: 'City Statistics' },
  ],
  'Departments': [
    { href: '/departments', label: 'Roads & Infrastructure' },
    { href: '/departments', label: 'Sanitation' },
    { href: '/departments', label: 'Water Supply' },
    { href: '/departments', label: 'Electricity' },
  ],
  'Resources': [
    { href: '/staff', label: 'Staff Console' },
    { href: '/departments', label: 'SLA Standards' },
    { href: '/how-it-works', label: 'Complaint Process' },
    { href: '/register', label: 'Create Account' },
  ],
};

export function SiteFooter() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">🏛️</span>
              </div>
              <div>
                <p className="font-bold text-white text-sm">Nagrik Setu</p>
                <p className="text-[9px] text-gray-500">नागरिक सेतु</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-gray-500">
              AI-powered civic grievance redressal platform with fake complaint detection,
              SLA tracking, and transparent resolution.
            </p>
            <div className="flex gap-3 mt-4">
              {['📧', '🐦', '📱'].map((icon, i) => (
                <span
                  key={i}
                  className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors cursor-pointer text-sm"
                >
                  {icon}
                </span>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-semibold text-white text-sm mb-4">{title}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-500 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} Nagrik Setu. Smart Grievance Redressal &amp; Fake Complaint Detection System.
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              All Systems Operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
