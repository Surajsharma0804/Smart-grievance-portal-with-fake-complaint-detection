import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router';
import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { ReactNode } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Auth Context
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Toast System
// ─────────────────────────────────────────────────────────────────────────────
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const ToastContext = createContext<{
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}>({ addToast: () => {} });

function useToast() {
  return useContext(ToastContext);
}

function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white animate-slide-in ${
              t.type === 'success'
                ? 'bg-emerald-600'
                : t.type === 'error'
                ? 'bg-red-600'
                : 'bg-blue-600'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared UI Components
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  SUBMITTED: { label: 'Submitted', bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
  ANALYZING: { label: 'Analyzing', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  ROUTED: { label: 'Routed', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  ASSIGNED: { label: 'Assigned', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  IN_PROGRESS: { label: 'In Progress', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  RESOLVED: { label: 'Resolved', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  CLOSED: { label: 'Closed', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
  NEEDS_REVIEW: { label: 'Needs Review', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  LINKED_DUPLICATE: { label: 'Duplicate', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  REOPENED: { label: 'Reopened', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      {cfg.label}
    </span>
  );
}

function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';
  return (
    <div className={`${sizeClass} border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin`} />
  );
}

function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="p-16 text-center bg-white border border-slate-200 rounded-xl">
      <div className="text-4xl mb-4">{icon}</div>
      <p className="text-base font-medium text-slate-700">{title}</p>
      <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">{subtitle}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Login Page
// ─────────────────────────────────────────────────────────────────────────────
function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate('/queue', { replace: true });
  }, [user, navigate]);

  const autofill = (e: string) => {
    setEmail(e);
    setPassword('password123');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const err = await login(email, password);
    setSubmitting(false);
    if (err) setError(err);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="w-full max-w-sm p-8 border border-slate-200 rounded-2xl bg-white shadow-lg space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-xl mb-4">
            <span className="text-2xl text-white">🏛️</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Nagrik Setu</h1>
          <p className="text-sm text-slate-500 mt-1">Staff & Administration Console</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
          <p className="font-semibold text-slate-700">Quick sign-in (demo credentials):</p>
          <div className="grid grid-cols-1 gap-1.5">
            {[
              { email: 'officer@test.com', label: 'Ward Officer', badge: 'OFFICER', color: 'text-blue-600' },
              { email: 'admin@test.com', label: 'Dept Admin', badge: 'DEPT_ADMIN', color: 'text-purple-600' },
              { email: 'reviewer@test.com', label: 'Reviewer', badge: 'REVIEWER', color: 'text-amber-600' },
            ].map((cred) => (
              <button
                key={cred.email}
                type="button"
                onClick={() => autofill(cred.email)}
                className="p-2 text-left bg-white border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all flex justify-between items-center"
              >
                <span className="font-medium text-slate-800">{cred.label}</span>
                <span className={`text-[10px] font-semibold ${cred.color}`}>{cred.badge}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 text-sm transition-colors shadow-sm"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2"><Spinner size="sm" /> Authenticating...</span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen gap-3">
        <Spinner size="lg" />
        <span className="text-sm text-slate-500">Loading staff session...</span>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Layout with Active Nav
// ─────────────────────────────────────────────────────────────────────────────
function DashboardLayout() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleQuickSwitch = async (email: string) => {
    await logout();
    await login(email, 'password123');
    window.location.reload();
  };

  const NAV = [
    { to: '/queue', label: 'Officer Queue', icon: '📋' },
    { to: '/review', label: 'Review Workbench', icon: '🔍' },
    { to: '/analytics', label: 'Analytics', icon: '📊' },
    { to: '/admin/departments', label: 'Departments', icon: '🏛️' },
    { to: '/admin/users', label: 'User Directory', icon: '👥' },
    { to: '/admin/contractors', label: 'Contractors', icon: '🏗️' },
  ];

  const isActive = (path: string) => {
    const current = location.pathname;
    if (path === '/queue') return current === '/queue' || current.startsWith('/queue/');
    return current.startsWith(path);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-bold text-lg text-slate-900 tracking-tight">Nagrik Setu</h2>
          <p className="text-xs text-slate-500">Staff & Review Console</p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive(n.to)
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
              }`}
            >
              <span>{n.icon}</span>
              <span>{n.label}</span>
            </Link>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-4 space-y-3">
          <div className="text-xs">
            <p className="font-semibold text-slate-900 truncate">{user?.name}</p>
            <p className="text-slate-500 truncate">{user?.email}</p>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
              user?.role === 'DEPT_ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-200' :
              user?.role === 'REVIEWER' ? 'bg-amber-50 text-amber-700 border-amber-200' :
              'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              {user?.role}
            </span>
          </div>

          <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Switch Persona</p>
            <div className="grid grid-cols-3 gap-1">
              {[
                { email: 'officer@test.com', label: 'Officer', role: 'OFFICER' },
                { email: 'admin@test.com', label: 'Admin', role: 'DEPT_ADMIN' },
                { email: 'reviewer@test.com', label: 'Reviewer', role: 'REVIEWER' },
              ].map((p) => (
                <button
                  key={p.email}
                  type="button"
                  onClick={() => handleQuickSwitch(p.email)}
                  title={`Switch to ${p.label}`}
                  className={`py-1 text-[11px] rounded font-medium transition-colors ${
                    user?.role === p.role
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full text-left text-xs text-red-600 hover:text-red-700 hover:underline"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <Routes>
          <Route index element={<Navigate to="queue" replace />} />
          <Route path="queue" element={<QueuePage />} />
          <Route path="queue/:id" element={<ComplaintDetailPage />} />
          <Route path="review" element={<ReviewPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="admin/departments" element={<DeptPage />} />
          <Route path="admin/users" element={<UsersPage />} />
          <Route path="admin/contractors" element={<ContractorsPage />} />
        </Routes>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VALID TRANSITIONS MAP (matches shared/transitions.ts)
// ─────────────────────────────────────────────────────────────────────────────
const TRANSITIONS: Record<string, string[]> = {
  SUBMITTED: ['ANALYZING'],
  ANALYZING: ['NEEDS_REVIEW', 'ROUTED', 'LINKED_DUPLICATE'],
  NEEDS_REVIEW: ['ROUTED', 'LINKED_DUPLICATE'],
  ROUTED: ['ASSIGNED'],
  ASSIGNED: ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  REOPENED: ['ASSIGNED'],
  CLOSED: [],
  LINKED_DUPLICATE: [],
};

const TRANSITION_ACTIONS: Record<string, { label: string; color: string; icon: string }> = {
  ANALYZING: { label: 'Analyze', color: 'bg-blue-600 hover:bg-blue-700', icon: '🔬' },
  NEEDS_REVIEW: { label: 'Flag for Review', color: 'bg-rose-600 hover:bg-rose-700', icon: '🚩' },
  ROUTED: { label: 'Route', color: 'bg-indigo-600 hover:bg-indigo-700', icon: '📨' },
  LINKED_DUPLICATE: { label: 'Mark Duplicate', color: 'bg-purple-600 hover:bg-purple-700', icon: '🔗' },
  ASSIGNED: { label: 'Assign', color: 'bg-cyan-600 hover:bg-cyan-700', icon: '👤' },
  IN_PROGRESS: { label: 'Start Work', color: 'bg-blue-600 hover:bg-blue-700', icon: '🔧' },
  RESOLVED: { label: 'Resolve', color: 'bg-emerald-600 hover:bg-emerald-700', icon: '✅' },
  CLOSED: { label: 'Close', color: 'bg-slate-600 hover:bg-slate-700', icon: '🔒' },
  REOPENED: { label: 'Reopen', color: 'bg-orange-600 hover:bg-orange-700', icon: '🔓' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Officer Queue Page
// ─────────────────────────────────────────────────────────────────────────────
function QueuePage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = useCallback(() => {
    setLoading(true);
    fetch('/api/officer/queue', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { complaints: [] }))
      .then((data) => setComplaints(data.complaints || []))
      .catch(() => setComplaints([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const handleQuickAction = async (e: React.MouseEvent, id: string, newStatus: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/complaints/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus, note: `Status → ${newStatus} via Staff Console` }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        addToast(err?.error?.message || 'Action failed', 'error');
        return;
      }
      addToast(`Complaint updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`, 'success');
      fetchQueue();
    } catch {
      addToast('Network error', 'error');
    }
  };

  // Fast-track: SUBMITTED → ANALYZING → ROUTED → ASSIGNED in sequence
  const handleFastTrack = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const steps = ['ANALYZING', 'ROUTED', 'ASSIGNED'];
    for (const status of steps) {
      const res = await fetch(`/api/complaints/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, note: `Fast-tracked: → ${status}` }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        addToast(err?.error?.message || `Failed at step ${status}`, 'error');
        fetchQueue();
        return;
      }
    }
    addToast('Complaint fast-tracked → Assigned', 'success');
    fetchQueue();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Officer Work Queue</h1>
          <p className="text-sm text-slate-500 mt-1">
            {complaints.length} grievance{complaints.length !== 1 ? 's' : ''} in queue — click any row to view details.
          </p>
        </div>
        <button
          onClick={fetchQueue}
          className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 shadow-sm inline-flex items-center gap-2"
        >
          <span>🔄</span> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-16 gap-3">
          <Spinner /> <span className="text-sm text-slate-500">Loading queue...</span>
        </div>
      ) : complaints.length === 0 ? (
        <EmptyState
          icon="📭"
          title="Queue is clear"
          subtitle="No open grievances assigned to you or awaiting action."
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Title & Category</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {complaints.map((c) => {
                const nextStatuses = TRANSITIONS[c.status] || [];
                return (
                  <tr
                    key={c._id}
                    onClick={() => navigate(`/queue/${c._id}`)}
                    className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-medium text-xs text-blue-600">{c.publicId}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 truncate max-w-xs">{c.title}</p>
                      <span className="text-xs text-slate-500">{c.category || c.citizenCategory || 'General'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        (c.priority || 0) >= 3 ? 'bg-red-50 text-red-700' :
                        (c.priority || 0) >= 2 ? 'bg-amber-50 text-amber-700' :
                        'bg-slate-50 text-slate-600'
                      }`}>
                        P{c.priority || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(c.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      {c.status === 'SUBMITTED' && (
                        <button
                          onClick={(e) => handleFastTrack(e, c._id)}
                          className="px-2.5 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 font-medium"
                          title="Analyze → Route → Assign in one step"
                        >
                          ⚡ Fast Track
                        </button>
                      )}
                      {c.status !== 'SUBMITTED' && nextStatuses.slice(0, 1).map((ns: string) => {
                        const action = TRANSITION_ACTIONS[ns];
                        if (!action) return null;
                        return (
                          <button
                            key={ns}
                            onClick={(e) => handleQuickAction(e, c._id, ns)}
                            className={`px-2.5 py-1 text-white rounded text-xs font-medium ${action.color}`}
                          >
                            {action.icon} {action.label}
                          </button>
                        );
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Complaint Detail Page (slide-in from queue)
// ─────────────────────────────────────────────────────────────────────────────
function ComplaintDetailPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();
  const location = useLocation();
  const complaintId = location.pathname.split('/').pop();

  const [complaint, setComplaint] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetail = useCallback(() => {
    if (!complaintId) return;
    setLoading(true);
    fetch(`/api/officer/queue`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        const found = (data.complaints || []).find((c: any) => c._id === complaintId);
        setComplaint(found || null);
      })
      .catch(() => setComplaint(null))
      .finally(() => setLoading(false));
  }, [complaintId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const handleTransition = async (newStatus: string) => {
    if (!complaint) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/complaints/${complaint._id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus, note: `Status → ${newStatus} by ${user?.name}` }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        addToast(err?.error?.message || 'Transition failed', 'error');
      } else {
        addToast(`Updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`, 'success');
        fetchDetail();
      }
    } catch {
      addToast('Network error', 'error');
    }
    setActionLoading(false);
  };

  const handleFastTrack = async () => {
    if (!complaint) return;
    setActionLoading(true);
    const steps = ['ANALYZING', 'ROUTED', 'ASSIGNED'];
    for (const status of steps) {
      const res = await fetch(`/api/complaints/${complaint._id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, note: `Fast-tracked: → ${status}` }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        addToast(err?.error?.message || `Failed at step ${status}`, 'error');
        fetchDetail();
        setActionLoading(false);
        return;
      }
    }
    addToast('Fast-tracked → Assigned', 'success');
    fetchDetail();
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 gap-3">
        <Spinner /> <span className="text-sm text-slate-500">Loading complaint details...</span>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate('/queue')} className="text-sm text-blue-600 hover:underline">
          ← Back to Queue
        </button>
        <EmptyState icon="🔍" title="Complaint not found" subtitle="This complaint may have been resolved or is no longer in your queue." />
      </div>
    );
  }

  const nextStatuses = TRANSITIONS[complaint.status] || [];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => navigate('/queue')} className="text-sm text-blue-600 hover:underline mb-3 inline-block">
            ← Back to Queue
          </button>
          <div className="flex items-center gap-3 mb-1">
            <span className="font-mono text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{complaint.publicId}</span>
            <StatusBadge status={complaint.status} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{complaint.title}</h1>
        </div>
        <span className={`px-3 py-1 rounded-lg text-sm font-bold ${
          (complaint.priority || 0) >= 3 ? 'bg-red-100 text-red-800' :
          (complaint.priority || 0) >= 2 ? 'bg-amber-100 text-amber-800' :
          'bg-slate-100 text-slate-700'
        }`}>
          Priority {complaint.priority || 0}
        </span>
      </div>

      {/* Actions Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-slate-700">Actions:</span>
        {complaint.status === 'SUBMITTED' && (
          <button
            onClick={handleFastTrack}
            disabled={actionLoading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            ⚡ Fast Track (Analyze → Route → Assign)
          </button>
        )}
        {nextStatuses.map((ns: string) => {
          const action = TRANSITION_ACTIONS[ns];
          if (!action) return null;
          return (
            <button
              key={ns}
              onClick={() => handleTransition(ns)}
              disabled={actionLoading}
              className={`px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 inline-flex items-center gap-1.5 ${action.color}`}
            >
              {action.icon} {action.label}
            </button>
          );
        })}
        {nextStatuses.length === 0 && complaint.status !== 'SUBMITTED' && (
          <span className="text-sm text-slate-500 italic">No further transitions available (terminal state).</span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Description</h3>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {complaint.description || 'No detailed description provided.'}
            </p>
          </div>

          {/* Status History Timeline */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-500 uppercase mb-4">Status Timeline</h3>
            {(!complaint.statusHistory || complaint.statusHistory.length === 0) ? (
              <p className="text-sm text-slate-400 italic">No status transitions recorded yet.</p>
            ) : (
              <ol className="relative border-l-2 border-slate-200 ml-2 space-y-4">
                {complaint.statusHistory.map((entry: any, i: number) => (
                  <li key={i} className="ml-6">
                    <div className={`absolute -left-[9px] w-4 h-4 rounded-full border-2 border-white ${
                      STATUS_CONFIG[entry.to]?.bg?.replace('bg-', 'bg-') || 'bg-slate-300'
                    }`} style={{
                      backgroundColor: entry.to === 'RESOLVED' ? '#059669' :
                        entry.to === 'IN_PROGRESS' ? '#d97706' :
                        entry.to === 'ASSIGNED' ? '#0891b2' :
                        entry.to === 'ROUTED' ? '#4f46e5' :
                        entry.to === 'ANALYZING' ? '#2563eb' : '#94a3b8'
                    }} />
                    <div className="flex items-center gap-2 mb-0.5">
                      <StatusBadge status={entry.to} />
                      <span className="text-[10px] text-slate-400">
                        from {STATUS_CONFIG[entry.from]?.label || entry.from}
                      </span>
                    </div>
                    {entry.note && (
                      <p className="text-xs text-slate-600 mt-0.5">{entry.note}</p>
                    )}
                    <time className="text-[10px] text-slate-400">
                      {new Date(entry.at).toLocaleString('en-IN')}
                    </time>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Details</h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-slate-500 text-xs">Category</dt>
                <dd className="font-medium text-slate-900">{complaint.category || complaint.citizenCategory || 'Unassigned'}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs">Department</dt>
                <dd className="font-medium text-slate-900">{complaint.departmentId?.name || 'Not routed'}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs">Ward</dt>
                <dd className="font-medium text-slate-900">{complaint.wardId?.name || complaint.wardId?.code || 'Unknown'}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-xs">Location</dt>
                <dd className="font-medium text-slate-900 text-xs font-mono">
                  {complaint.location?.coordinates
                    ? `${complaint.location.coordinates[1]?.toFixed(5)}, ${complaint.location.coordinates[0]?.toFixed(5)}`
                    : 'Not set'}
                </dd>
              </div>
              {complaint.address && (
                <div>
                  <dt className="text-slate-500 text-xs">Address</dt>
                  <dd className="font-medium text-slate-900">{complaint.address}</dd>
                </div>
              )}
              <div>
                <dt className="text-slate-500 text-xs">Created</dt>
                <dd className="font-medium text-slate-900">{new Date(complaint.createdAt).toLocaleString('en-IN')}</dd>
              </div>
              {complaint.slaDueAt && (
                <div>
                  <dt className="text-slate-500 text-xs">SLA Due</dt>
                  <dd className={`font-medium ${
                    new Date(complaint.slaDueAt) < new Date() ? 'text-red-600' : 'text-slate-900'
                  }`}>
                    {new Date(complaint.slaDueAt).toLocaleString('en-IN')}
                    {new Date(complaint.slaDueAt) < new Date() && ' ⚠️ OVERDUE'}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-slate-500 text-xs">Upvotes</dt>
                <dd className="font-medium text-slate-900">👍 {complaint.upvotes || 0}</dd>
              </div>
              {complaint.anonymous && (
                <div>
                  <dt className="text-slate-500 text-xs">Anonymous</dt>
                  <dd className="font-medium text-amber-700">Yes — identity hidden</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Media */}
          {complaint.media && complaint.media.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">
                Evidence Photos ({complaint.media.length})
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {complaint.media.map((m: any, i: number) => (
                  <div key={i} className="border rounded-lg p-1 bg-slate-50 text-center">
                    <p className="text-[10px] text-slate-500 truncate">{m.kind || 'photo'}</p>
                    <p className="text-[10px] text-slate-400 truncate">{m.key || 'media'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Review Workbench
// ─────────────────────────────────────────────────────────────────────────────
function ReviewPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isReviewer = user?.role === 'REVIEWER' || user?.role === 'DEPT_ADMIN';

  const fetchTasks = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch('/api/admin/review-tasks?status=pending', { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => null);
          throw new Error(err?.error?.message || `Failed to fetch tasks (${r.status})`);
        }
        return r.json();
      })
      .then((data) => setTasks(data.tasks || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleDecision = async (id: string, action: string, reason: string) => {
    const res = await fetch(`/api/admin/review-tasks/${id}/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action, reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      addToast(err?.error?.message || 'Decision failed', 'error');
    } else {
      addToast(`Review decision: ${action}`, 'success');
    }
    fetchTasks();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reviewer Workbench</h1>
          <p className="text-sm text-slate-500 mt-1">
            Complaints flagged by trust scoring, duplicate clustering, or ELA forensics.
          </p>
        </div>
        <button
          onClick={fetchTasks}
          className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 shadow-sm inline-flex items-center gap-2"
        >
          <span>🔄</span> Refresh
        </button>
      </div>

      {!isReviewer && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2">
          <span>ℹ️</span>
          <span>Viewing in read-only mode as <strong>{user?.name || 'Officer'}</strong>. Adjudicating decisions requires the <strong>Reviewer</strong> or <strong>Admin</strong> role.</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-16 gap-3">
          <Spinner /> <span className="text-sm text-slate-500">Loading review workbench...</span>
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon="✨"
          title="Review queue is clean"
          subtitle="No complaints currently flagged for human verification. Legitimate complaints proceed directly to the Officer Queue."
        />
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <div key={task._id} className="p-6 bg-white border border-slate-200 rounded-xl space-y-4 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    {task.complaintId?.title || 'Flagged Grievance'}
                  </h3>
                  <p className="text-xs text-rose-600 font-medium mt-0.5">⚠️ Flag: {task.reason}</p>
                </div>
                <StatusBadge status={task.status} />
              </div>

              {task.evidence && (
                <div className="p-3 bg-slate-50 rounded-lg text-xs font-mono text-slate-700 space-y-1">
                  <p className="font-bold text-slate-800">Evidence Indicators:</p>
                  <pre className="overflow-x-auto">{JSON.stringify(task.evidence, null, 2)}</pre>
                </div>
              )}

              {isReviewer && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => handleDecision(task._id, 'APPROVE', 'Verified genuine by human reviewer')}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 inline-flex items-center gap-1.5"
                  >
                    ✓ Approve & Route
                  </button>
                  <button
                    onClick={() => handleDecision(task._id, 'REJECT', 'Confirmed fake / stock photo by reviewer')}
                    className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-medium hover:bg-rose-700 inline-flex items-center gap-1.5"
                  >
                    ✕ Reject & Close
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Analytics Page — Real Data from API
// ─────────────────────────────────────────────────────────────────────────────
function AnalyticsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch('/api/admin/analytics/summary', { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => null);
          throw new Error(err?.error?.message || `Failed to fetch analytics (${r.status})`);
        }
        return r.json();
      })
      .then((data) => setSummary(data.summary))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 gap-3">
        <Spinner /> <span className="text-sm text-slate-500">Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Operational Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time metrics from your complaint database.</p>
        </div>
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      </div>
    );
  }

  const statusCounts = summary?.statusCounts || {};
  const categoryCounts = summary?.categoryCounts || {};
  const total = summary?.totalComplaints || 0;
  const overdue = summary?.overdueComplaints || 0;
  const resolved = (statusCounts['RESOLVED'] || 0) + (statusCounts['CLOSED'] || 0);
  const resolutionRate = total > 0 ? ((resolved / total) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Operational Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time metrics from your complaint database.</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 shadow-sm inline-flex items-center gap-2"
        >
          <span>🔄</span> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-slate-200 rounded-xl">
          <p className="text-xs font-medium text-slate-500">Total Complaints</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{total}</p>
          <p className="text-[11px] text-slate-400 mt-1">All time submissions</p>
        </div>
        <div className="p-5 bg-white border border-slate-200 rounded-xl">
          <p className="text-xs font-medium text-slate-500">Resolution Rate</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">{resolutionRate}%</p>
          <p className="text-[11px] text-slate-400 mt-1">{resolved} resolved + closed</p>
        </div>
        <div className="p-5 bg-white border border-slate-200 rounded-xl">
          <p className="text-xs font-medium text-slate-500">Overdue (SLA Breach)</p>
          <p className={`text-3xl font-bold mt-1 ${overdue > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{overdue}</p>
          <p className="text-[11px] text-slate-400 mt-1">Past SLA deadline</p>
        </div>
        <div className="p-5 bg-white border border-slate-200 rounded-xl">
          <p className="text-xs font-medium text-slate-500">Active (Open)</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{total - resolved}</p>
          <p className="text-[11px] text-slate-400 mt-1">Awaiting resolution</p>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-700 uppercase mb-4">By Status</h3>
          {Object.keys(statusCounts).length === 0 ? (
            <p className="text-sm text-slate-400 italic">No data yet.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(statusCounts).sort(([,a], [,b]) => (b as number) - (a as number)).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <StatusBadge status={status} />
                  <div className="flex items-center gap-3 flex-1 ml-3">
                    <div className="flex-1 bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-blue-500 rounded-full h-2 transition-all"
                        style={{ width: `${Math.max(4, ((count as number) / total) * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-slate-900 w-8 text-right">{count as number}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-700 uppercase mb-4">By Category</h3>
          {Object.keys(categoryCounts).length === 0 ? (
            <p className="text-sm text-slate-400 italic">No data yet.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(categoryCounts).sort(([,a], [,b]) => (b as number) - (a as number)).map(([cat, count]) => (
                <div key={cat} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700 font-medium truncate max-w-[160px]">{cat}</span>
                  <div className="flex items-center gap-3 flex-1 ml-3">
                    <div className="flex-1 bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-purple-500 rounded-full h-2 transition-all"
                        style={{ width: `${Math.max(4, ((count as number) / total) * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-slate-900 w-8 text-right">{count as number}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Departments Page
// ─────────────────────────────────────────────────────────────────────────────
function DeptPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [sla, setSla] = useState(48);

  const isAdmin = user?.role === 'DEPT_ADMIN';

  const fetchDepts = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch('/api/admin/departments', { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => null);
          throw new Error(err?.error?.message || `Failed to fetch departments (${r.status})`);
        }
        return r.json();
      })
      .then((data) => setDepartments(data.departments || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchDepts(); }, [fetchDepts]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ code, name, defaultSlaHours: Number(sla) }),
    });
    if (res.ok) {
      setCode('');
      setName('');
      addToast('Department created', 'success');
      fetchDepts();
    } else {
      const err = await res.json().catch(() => null);
      addToast(err?.error?.message || 'Failed to create department', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Department Administration</h1>
          <p className="text-sm text-slate-500 mt-1">Manage municipal service divisions and SLA commitments.</p>
        </div>
        <button
          onClick={fetchDepts}
          className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 shadow-sm inline-flex items-center gap-2"
        >
          <span>🔄</span> Refresh
        </button>
      </div>

      {!isAdmin ? (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs flex items-center gap-2">
          <span>ℹ️</span>
          <span>Viewing departments. Creating new departments requires the <strong>Dept Admin</strong> role.</span>
        </div>
      ) : (
        <form onSubmit={handleCreate} className="p-4 bg-white border border-slate-200 rounded-xl flex gap-3 items-end shadow-sm">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-700 mb-1">Code</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. ROADS" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex-[2]">
            <label className="block text-xs font-medium text-slate-700 mb-1">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Roads & Infrastructure" required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="w-28">
            <label className="block text-xs font-medium text-slate-700 mb-1">SLA (Hours)</label>
            <input type="number" value={sla} onChange={(e) => setSla(Number(e.target.value))} required className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 whitespace-nowrap">
            Add Department
          </button>
        </form>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-16 gap-3">
          <Spinner /> <span className="text-sm text-slate-500">Loading departments...</span>
        </div>
      ) : departments.length === 0 ? (
        <EmptyState
          icon="🏛️"
          title="No departments found"
          subtitle="Departments may not have been seeded yet. Try refreshing or contact the administrator."
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Default SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departments.map((d) => (
                <tr key={d._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-medium text-xs text-blue-600">{d.code}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{d.name}</td>
                  <td className="px-4 py-3 text-slate-600">{d.defaultSlaHours} hours</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Users Page
// ─────────────────────────────────────────────────────────────────────────────
function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch('/api/admin/users', { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => null);
          throw new Error(err?.error?.message || `Failed to fetch users (${r.status})`);
        }
        return r.json();
      })
      .then((data) => setUsers(data.users || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const roleBadge = (role: string) => {
    const styles: Record<string, string> = {
      OFFICER: 'bg-blue-50 text-blue-700 border-blue-200',
      DEPT_ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
      REVIEWER: 'bg-amber-50 text-amber-700 border-amber-200',
      CITIZEN: 'bg-green-50 text-green-700 border-green-200',
    };
    return styles[role] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Directory & Roles</h1>
          <p className="text-sm text-slate-500 mt-1">Authorized officers, reviewers, and department administrators.</p>
        </div>
        <button
          onClick={fetchUsers}
          className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 shadow-sm inline-flex items-center gap-2"
        >
          <span>🔄</span> Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-16 gap-3">
          <Spinner /> <span className="text-sm text-slate-500">Loading user directory...</span>
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon="👥"
          title="No users found"
          subtitle="User accounts may not have been seeded yet."
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Reputation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleBadge(u.role)}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{u.reputation?.score ?? 100}/100</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Contractors Management Page
// ─────────────────────────────────────────────────────────────────────────────
function ContractorsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [contractors, setContractors] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'contractors' | 'projects'>('contractors');

  const isAdmin = user?.role === 'DEPT_ADMIN';

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch('/api/admin/contractors', { credentials: 'include' })
        .then(r => r.ok ? r.json() : { contractors: [] }),
      fetch('/api/public/projects?status=OPEN,BIDDING,AWARDED,IN_PROGRESS,COMPLETED', { credentials: 'include' })
        .then(r => r.ok ? r.json() : { projects: [] }),
    ])
      .then(([cData, pData]) => {
        setContractors(cData.contractors || []);
        setProjects(pData.projects || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleVerify = async (id: string, verified: boolean) => {
    const res = await fetch(`/api/admin/contractors/${id}/verify`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ verified }),
    });
    if (res.ok) {
      addToast(verified ? 'Contractor verified' : 'Contractor unverified', 'success');
      fetchData();
    } else {
      const err = await res.json().catch(() => null);
      addToast(err?.error?.message || 'Action failed', 'error');
    }
  };

  const PROJECT_STATUS: Record<string, { label: string; color: string }> = {
    OPEN: { label: 'Open', color: 'bg-green-50 text-green-700 border-green-200' },
    BIDDING: { label: 'Bidding', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    AWARDED: { label: 'Awarded', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    IN_PROGRESS: { label: 'In Progress', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    COMPLETED: { label: 'Completed', color: 'bg-slate-50 text-slate-600 border-slate-200' },
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Contractor & Project Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Verify contractors, manage municipal repair projects, and track bids.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 shadow-sm inline-flex items-center gap-2"
        >
          <span>🔄</span> Refresh
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl text-center">
          <p className="text-2xl font-bold text-slate-900">{contractors.length}</p>
          <p className="text-xs text-slate-500">Total Contractors</p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl text-center">
          <p className="text-2xl font-bold text-green-600">{contractors.filter(c => c.verified).length}</p>
          <p className="text-xs text-slate-500">Verified</p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl text-center">
          <p className="text-2xl font-bold text-blue-600">{projects.length}</p>
          <p className="text-xs text-slate-500">Total Projects</p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl text-center">
          <p className="text-2xl font-bold text-amber-600">{projects.filter(p => p.status === 'OPEN' || p.status === 'BIDDING').length}</p>
          <p className="text-xs text-slate-500">Open for Bids</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab('contractors')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'contractors' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          👷 Contractors ({contractors.length})
        </button>
        <button
          onClick={() => setTab('projects')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'projects' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          📋 Projects ({projects.length})
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-16 gap-3">
          <Spinner /> <span className="text-sm text-slate-500">Loading...</span>
        </div>
      ) : tab === 'contractors' ? (
        contractors.length === 0 ? (
          <EmptyState icon="👷" title="No contractors registered" subtitle="Contractors register through the public portal and appear here for verification." />
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Experience</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Projects</th>
                  <th className="px-4 py-3">Status</th>
                  {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contractors.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{c.companyName}</p>
                      {c.specializations && c.specializations.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {c.specializations.slice(0, 3).map((s: string) => (
                            <span key={s} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{s}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-900 text-xs">{c.userId?.name || '—'}</p>
                      <p className="text-slate-400 text-xs">{c.userId?.email || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.experience || 0}y</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="text-amber-400 text-xs">★</span>
                        <span className="text-sm font-medium">{(c.rating || 0).toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.completedProjects || 0}/{c.totalProjects || 0}</td>
                    <td className="px-4 py-3">
                      {c.verified ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                          ✓ Verified
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          ⏳ Pending
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        {c.verified ? (
                          <button
                            onClick={() => handleVerify(c._id, false)}
                            className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100"
                          >
                            Revoke
                          </button>
                        ) : (
                          <button
                            onClick={() => handleVerify(c._id, true)}
                            className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700"
                          >
                            ✓ Verify
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        projects.length === 0 ? (
          <EmptyState icon="📋" title="No projects created" subtitle="Projects are created when municipal complaints require infrastructure repair work." />
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Est. Cost</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.map((p) => {
                  const pStatus = PROJECT_STATUS[p.status] || { label: p.status, color: 'bg-slate-50 text-slate-600 border-slate-200' };
                  return (
                    <tr key={p._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900 truncate max-w-xs">{p.title}</p>
                        <p className="text-xs text-slate-400 truncate max-w-xs">{p.description}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{p.category || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${pStatus.color}`}>
                          {pStatus.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-green-700">
                        {p.estimatedCost ? `₹${p.estimatedCost.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(p.createdAt).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// App Entry
// ─────────────────────────────────────────────────────────────────────────────
export function App() {
  return (
    <BrowserRouter basename="/staff">
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="login" element={<LoginPage />} />
            <Route path="staff/login" element={<Navigate to="/login" replace />} />
            <Route path="staff/*" element={<Navigate to="/login" replace />} />
            <Route
              path="/*"
              element={
                <RequireAuth>
                  <DashboardLayout />
                </RequireAuth>
              }
            />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
