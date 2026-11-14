import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link } from 'react-router';
import { useState, useEffect, createContext, useContext } from 'react';
import type { ReactNode } from 'react';

// Auth context
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  loading: true,
  login: async () => 'Not initialized',
  logout: async () => {},
});

function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUser(data?.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string): Promise<string | null> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return body?.error?.message || 'Login failed';
    }
    const body = await res.json();
    setUser(body.user);
    return null;
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Pages
function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate('/staff/queue', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const err = await login(email, password);
    setSubmitting(false);
    if (err) setError(err);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-sm p-6 border rounded-lg bg-white">
        <h1 className="text-xl font-bold mb-4">Staff Login</h1>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (!user) return <Navigate to="/staff/login" replace />;
  return <>{children}</>;
}

function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/staff/login');
  };

  const NAV = [
    { to: '/staff/queue', label: 'Queue' },
    { to: '/staff/review', label: 'Review' },
    { to: '/staff/analytics', label: 'Analytics' },
    { to: '/staff/admin/departments', label: 'Departments' },
    { to: '/staff/admin/users', label: 'Users' },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r bg-gray-50 p-4 flex flex-col">
        <h2 className="font-semibold mb-4">Nagrik Setu Staff</h2>
        <nav className="space-y-1 text-sm flex-1">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="block p-2 rounded hover:bg-gray-100">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t pt-3 text-sm">
          <p className="text-gray-500 mb-2">{user?.name}</p>
          <button onClick={handleLogout} className="text-red-600 hover:underline text-sm">
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6 bg-white">
        <Routes>
          <Route index element={<Navigate to="queue" replace />} />
          <Route path="queue" element={<QueuePage />} />
          <Route path="review" element={<ReviewPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="admin/departments" element={<DeptPage />} />
          <Route path="admin/users" element={<UsersPage />} />
        </Routes>
      </main>
    </div>
  );
}

function QueuePage() {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Officer Queue</h2>
      <p className="text-gray-500">Complaints assigned to your department will appear here.</p>
    </div>
  );
}

function ReviewPage() {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Review Tasks</h2>
      <p className="text-gray-500">Complaints flagged for review will appear here.</p>
    </div>
  );
}

function AnalyticsPage() {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Analytics</h2>
      <p className="text-gray-500">Department analytics and charts will appear here.</p>
    </div>
  );
}

function DeptPage() {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Departments</h2>
      <p className="text-gray-500">Department management will appear here.</p>
    </div>
  );
}

function UsersPage() {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Users</h2>
      <p className="text-gray-500">User management will appear here.</p>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter basename="/staff">
      <AuthProvider>
        <Routes>
          <Route path="login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <RequireAuth>
                <DashboardLayout />
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
