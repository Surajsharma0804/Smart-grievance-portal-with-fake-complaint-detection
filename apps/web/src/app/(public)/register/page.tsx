'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { registerAction, type AuthState } from '@/lib/auth-actions';

const initial: AuthState = {};

export default function RegisterPage() {
  const [state, action, pending] = useActionState(registerAction, initial);

  return (
    <div className="mx-auto max-w-md mt-8 sm:mt-16 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-2xl">👤</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Create your account</h1>
        <p className="text-sm text-gray-500 mt-1.5">Join Nagrik Setu to report civic issues and track resolutions</p>
      </div>

      {state.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
          <span>⚠️</span> {state.error}
        </div>
      )}

      <form action={action} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
            Full name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            minLength={2}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your full name"
          />
          {state.fieldErrors?.name && (
            <p className="text-xs text-red-600 mt-1">{state.fieldErrors.name}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="you@example.com"
          />
          {state.fieldErrors?.email && (
            <p className="text-xs text-red-600 mt-1">{state.fieldErrors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
            Password <span className="text-gray-400 font-normal">(min 8 characters)</span>
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {state.fieldErrors?.password && (
            <p className="text-xs text-red-600 mt-1">{state.fieldErrors.password}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 text-sm transition-colors"
        >
          {pending ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-sm text-center text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-600 hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
