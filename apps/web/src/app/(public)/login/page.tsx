'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { loginAction, type AuthState } from '@/lib/auth-actions';

const initial: AuthState = {};

const DEMO_ACCOUNTS = [
  { label: 'Citizen', email: 'citizen@test.com', icon: '👤' },
  { label: 'Ward Officer', email: 'officer@test.com', icon: '👷' },
  { label: 'Dept Admin', email: 'admin@test.com', icon: '🏛️' },
  { label: 'Reviewer', email: 'reviewer@test.com', icon: '🔍' },
];

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, initial);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function autofill(demoEmail: string) {
    setEmail(demoEmail);
    setPassword('password123');
  }

  return (
    <div className="mx-auto max-w-md mt-8 sm:mt-16 px-4" suppressHydrationWarning>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-teal-700 rounded-xl flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-2xl">🏛️</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Sign in to Nagrik Setu</h1>
        <p className="text-sm text-gray-500 mt-1.5">Access citizen services or staff management console</p>
      </div>

      {state.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
          <span>⚠️</span> {state.error}
        </div>
      )}

      {/* Demo credentials */}
      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <p className="text-xs font-semibold text-slate-600 mb-2.5">Quick sign-in (demo accounts):</p>
        <div className="grid grid-cols-2 gap-1.5">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              type="button"
              onClick={() => autofill(acc.email)}
              className="flex items-center gap-2 p-2 text-left bg-white border border-gray-200 rounded-lg hover:border-teal-400 hover:bg-teal-50 transition-colors text-xs"
            >
              <span className="text-base">{acc.icon}</span>
              <div>
                <span className="font-medium text-slate-800 block">{acc.label}</span>
                <span className="text-[10px] text-slate-400">{acc.email}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            placeholder="you@example.com"
          />
          {state.fieldErrors?.email && (
            <p className="text-xs text-red-600 mt-1">{state.fieldErrors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
          {state.fieldErrors?.password && (
            <p className="text-xs text-red-600 mt-1">{state.fieldErrors.password}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full py-2.5 bg-teal-700 text-white rounded-lg font-semibold hover:bg-teal-800 disabled:opacity-50 text-sm transition-colors"
        >
          {pending ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-sm text-center text-gray-500">
        New citizen?{' '}
        <Link href="/register" className="text-teal-700 hover:underline font-medium">
          Create an account
        </Link>
      </p>
    </div>
  );
}
