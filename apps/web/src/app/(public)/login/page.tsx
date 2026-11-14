'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { loginAction, type AuthState } from '@/lib/auth-actions';

const initial: AuthState = {};

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, initial);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function autofill(demoEmail: string) {
    setEmail(demoEmail);
    setPassword('password123');
  }

  return (
    <div className="mx-auto max-w-md mt-12 px-4" suppressHydrationWarning>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Sign in to Nagrik Setu</h1>
        <p className="text-sm text-gray-500 mt-1">Access citizen services or staff management console</p>
      </div>

      {state.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {state.error}
        </div>
      )}

      {/* Quick Demo Credentials Autofill */}
      <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
        <p className="font-semibold text-slate-700">Quick sign-in credentials (1-click fill):</p>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => autofill('citizen@test.com')}
            className="p-1.5 text-left bg-white border border-slate-200 rounded hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <span className="font-medium text-slate-800 block">Citizen</span>
            <span className="text-[10px] text-slate-500">citizen@test.com</span>
          </button>
          <button
            type="button"
            onClick={() => autofill('officer@test.com')}
            className="p-1.5 text-left bg-white border border-slate-200 rounded hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <span className="font-medium text-slate-800 block">Ward Officer</span>
            <span className="text-[10px] text-slate-500">officer@test.com</span>
          </button>
          <button
            type="button"
            onClick={() => autofill('admin@test.com')}
            className="p-1.5 text-left bg-white border border-slate-200 rounded hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <span className="font-medium text-slate-800 block">Dept Admin</span>
            <span className="text-[10px] text-slate-500">admin@test.com</span>
          </button>
          <button
            type="button"
            onClick={() => autofill('reviewer@test.com')}
            className="p-1.5 text-left bg-white border border-slate-200 rounded hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <span className="font-medium text-slate-800 block">Reviewer</span>
            <span className="text-[10px] text-slate-500">reviewer@test.com</span>
          </button>
        </div>
      </div>

      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {state.fieldErrors?.email && (
            <p className="text-sm text-red-600 mt-1">{state.fieldErrors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {state.fieldErrors?.password && (
            <p className="text-sm text-red-600 mt-1">{state.fieldErrors.password}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 text-sm shadow-sm"
        >
          {pending ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p className="mt-4 text-sm text-center text-gray-600">
        New citizen?{' '}
        <Link href="/register" className="text-blue-600 hover:underline font-medium">
          Create an account
        </Link>
      </p>
    </div>
  );
}
