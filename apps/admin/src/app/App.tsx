import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link } from 'react-router';
import { useState, useEffect, createContext, useContext } from 'react';
import type { ReactNode } from 'react';

// --- Auth Context ---
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

// --- Shared Components ---
function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    SUBMITTED: 'bg-gray-100 text-gray-800 border-gray-200',
    ANALYZING: 'bg-blue-50 text-blue-700 border-blue-200',
    ROUTED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    ASSIGNED: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
    RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CLOSED: 'bg-slate-100 text-slate-600 border-slate-200',
    NEEDS_REVIEW: 'bg-rose-50 text-rose-700 border-rose-200',
    LINKED_DUPLICATE: 'bg-purple-50 text-purple-700 border-purple-200',
  };
  const cls = colorMap[status] || 'bg-gray-50 text-gray-700 border-gray-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>
      {status}
    </span>
  );
}

// --- Login Page ---
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
    <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
      <div className="w-full max-w-sm p-8 border border-slate-200 rounded-xl bg-white shadow-sm space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Staff Console</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in with officer or admin credentials.</p>
        </div>
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* 1-Click Role Login for verification */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
          <p className="font-semibold text-slate-700">Quick sign-in credentials:</p>
          <div className="grid grid-cols-1 gap-1.5">
            <button
              type="button"
              onClick={() => autofill('officer@test.com')}
              className="p-1.5 text-left bg-white border border-slate-200 rounded hover:border-blue-400 hover:bg-blue-50 transition-colors flex justify-between"
            >
              <span className="font-medium text-slate-800">Ward Officer</span>
              <span className="text-slate-400">officer@test.com</span>
            </button>
            <button
              type="button"
              onClick={() => autofill('admin@test.com')}
              className="p-1.5 text-left bg-white border border-slate-200 rounded hover:border-blue-400 hover:bg-blue-50 transition-colors flex justify-between"
            >
              <span className="font-medium text-slate-800">Dept Admin</span>
              <span className="text-slate-400">admin@test.com</span>
            </button>
            <button
              type="button"
              onClick={() => autofill('reviewer@test.com')}
              className="p-1.5 text-left bg-white border border-slate-200 rounded hover:border-blue-400 hover:bg-blue-50 transition-colors flex justify-between"
            >
              <span className="font-medium text-slate-800">Reviewer</span>
              <span className="text-slate-400">reviewer@test.com</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 text-sm transition-colors"
          >
            {submitting ? 'Authenticating...' : 'Sign In'}
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
      <div className="flex items-center justify-center min-h-screen text-sm text-slate-500">
        Loading staff session...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// --- Layout ---
function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const NAV = [
    { to: '/queue', label: 'Officer Queue', icon: '📋' },
    { to: '/review', label: 'Review Workbench', icon: '🔍' },
    { to: '/analytics', label: 'Analytics', icon: '📊' },
    { to: '/admin/departments', label: 'Departments', icon: '🏛️' },
    { to: '/admin/users', label: 'User Directory', icon: '👥' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-64 border-r border-slate-200 bg-white p-5 flex flex-col justify-between">
        <div className="space-y-6">
          <div>
            <h2 className="font-bold text-lg text-slate-900 tracking-tight">Nagrik Setu</h2>
            <p className="text-xs text-slate-500">Staff & Review Console</p>
          </div>
          <nav className="space-y-1 text-sm font-medium">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                <span>{n.icon}</span>
                <span>{n.label}</span>
              </Link>
            ))}
          </nav>
        </div>
        <div className="border-t border-slate-100 pt-4 space-y-2">
          <div className="text-xs text-slate-500">
            <p className="font-medium text-slate-800">{user?.name}</p>
            <p className="truncate">{user?.email}</p>
            <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold">
              {user?.role}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left text-xs text-red-600 hover:text-red-700 hover:underline pt-2"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-y-auto">
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

// --- Features ---

function QueuePage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = () => {
    setLoading(true);
    fetch('/api/officer/queue', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { complaints: [] }))
      .then((data) => setComplaints(data.complaints || []))
      .catch(() => setComplaints([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    await fetch(`/api/complaints/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status: newStatus, note: 'Status updated via Staff Console' }),
    });
    fetchQueue();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Officer Work Queue</h1>
          <p className="text-sm text-slate-500 mt-1">
            Grievances prioritized by severity and SLA deadline.
          </p>
        </div>
        <button
          onClick={fetchQueue}
          className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 shadow-sm"
        >
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-slate-500">Loading queue...</div>
      ) : complaints.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-xl space-y-2">
          <p className="text-base font-medium text-slate-700">No open complaints assigned</p>
          <p className="text-xs text-slate-500">All assigned grievances have been resolved or routed.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Title & Category</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {complaints.map((c) => (
                <tr key={c._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-medium text-xs text-blue-600">{c.publicId}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{c.title}</p>
                    <span className="text-xs text-slate-500">{c.category || 'General'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700">
                      P{c.priority || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3 space-x-2">
                    {c.status === 'ASSIGNED' && (
                      <button
                        onClick={() => handleUpdateStatus(c._id, 'IN_PROGRESS')}
                        className="px-2.5 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                      >
                        Start Work
                      </button>
                    )}
                    {c.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => handleUpdateStatus(c._id, 'RESOLVED')}
                        className="px-2.5 py-1 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700"
                      >
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ReviewPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = () => {
    setLoading(true);
    fetch('/api/admin/review-tasks?status=pending', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { tasks: [] }))
      .then((data) => setTasks(data.tasks || []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleDecision = async (id: string, action: string, reason: string) => {
    await fetch(`/api/admin/review-tasks/${id}/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action, reason }),
    });
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
          className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 shadow-sm"
        >
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-slate-500">Loading review workbench...</div>
      ) : tasks.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-xl space-y-2">
          <p className="text-base font-medium text-slate-700">Review queue is clean</p>
          <p className="text-xs text-slate-500">No complaints currently flagged for human verification.</p>
        </div>
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

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => handleDecision(task._id, 'APPROVE', 'Verified genuine by human reviewer')}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700"
                >
                  ✓ Approve & Route
                </button>
                <button
                  onClick={() => handleDecision(task._id, 'REJECT', 'Confirmed fake / stock photo by reviewer')}
                  className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-medium hover:bg-rose-700"
                >
                  ✕ Reject & Close
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DeptPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [sla, setSla] = useState(48);

  const fetchDepts = () => {
    fetch('/api/admin/departments', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { departments: [] }))
      .then((data) => setDepartments(data.departments || []));
  };

  useEffect(() => {
    fetchDepts();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/admin/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ code, name, defaultSlaHours: Number(sla) }),
    });
    setCode('');
    setName('');
    fetchDepts();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Department Administration</h1>
        <p className="text-sm text-slate-500 mt-1">Manage municipal service divisions and SLA commitments.</p>
      </div>

      <form onSubmit={handleCreate} className="p-4 bg-white border border-slate-200 rounded-xl flex gap-3 items-end shadow-sm">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-700 mb-1">Code</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. ROADS"
            required
            className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
          />
        </div>
        <div className="flex-2">
          <label className="block text-xs font-medium text-slate-700 mb-1">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Roads & Infrastructure"
            required
            className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
          />
        </div>
        <div className="w-24">
          <label className="block text-xs font-medium text-slate-700 mb-1">SLA (Hours)</label>
          <input
            type="number"
            value={sla}
            onChange={(e) => setSla(Number(e.target.value))}
            required
            className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700"
        >
          Add Department
        </button>
      </form>

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
    </div>
  );
}

function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/admin/users', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { users: [] }))
      .then((data) => setUsers(data.users || []));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Directory & Roles</h1>
        <p className="text-sm text-slate-500 mt-1">Authorized officers, reviewers, and department administrators.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Reputation Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u._id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{u.name}</td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700">
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{u.reputation?.score ?? 100}/100</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Operational Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">SLA compliance, duplicate cluster metrics, and resolution speed.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-5 bg-white border border-slate-200 rounded-xl">
          <p className="text-xs font-medium text-slate-500">SLA Compliance</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">94.8%</p>
          <p className="text-[11px] text-slate-400 mt-1">Within target SLA window</p>
        </div>
        <div className="p-5 bg-white border border-slate-200 rounded-xl">
          <p className="text-xs font-medium text-slate-500">Duplicate Clusters Formed</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">42</p>
          <p className="text-[11px] text-slate-400 mt-1">118 duplicate grievances merged</p>
        </div>
        <div className="p-5 bg-white border border-slate-200 rounded-xl">
          <p className="text-xs font-medium text-slate-500">Review Override Rate</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">3.2%</p>
          <p className="text-[11px] text-slate-400 mt-1">Human overrides on AI triage</p>
        </div>
      </div>
    </div>
  );
}

// --- App Entry ---
export function App() {
  return (
    <BrowserRouter basename="/staff">
      <AuthProvider>
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
      </AuthProvider>
    </BrowserRouter>
  );
}
