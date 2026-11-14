'use client';

import { useActionState } from 'react';
import { registerAction, type AuthState } from '@/lib/auth-actions';

const initial: AuthState = {};

export default function RegisterPage() {
  const [state, action, pending] = useActionState(registerAction, initial);

  return (
    <div className="mx-auto max-w-md mt-16 px-4">
      <h1 className="text-2xl font-bold mb-6">Create your account</h1>

      {state.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
          {state.error}
        </div>
      )}

      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Full name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {state.fieldErrors?.name && (
            <p className="text-sm text-red-600 mt-1">{state.fieldErrors.name}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {state.fieldErrors?.email && (
            <p className="text-sm text-red-600 mt-1">{state.fieldErrors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Password (min 8 characters)
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {state.fieldErrors?.password && (
            <p className="text-sm text-red-600 mt-1">{state.fieldErrors.password}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="mt-4 text-sm text-center text-gray-600">
        Already have an account?{' '}
        <a href="/login" className="text-blue-600 hover:underline">
          Sign in
        </a>
      </p>
    </div>
  );
}
