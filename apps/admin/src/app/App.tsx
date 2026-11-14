import { BrowserRouter, Routes, Route, Navigate } from 'react-router';

function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-sm p-6 border rounded-lg bg-white">
        <h1 className="text-xl font-bold mb-4">Staff Login</h1>
        <p className="text-gray-500">Login form will be implemented here.</p>
      </div>
    </div>
  );
}

function DashboardLayout() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r bg-gray-50 p-4">
        <h2 className="font-semibold mb-4">Nagrik Setu</h2>
        <nav className="space-y-1 text-sm">
          <a href="/staff/queue" className="block p-2 rounded hover:bg-gray-100">Queue</a>
          <a href="/staff/review" className="block p-2 rounded hover:bg-gray-100">Review</a>
          <a href="/staff/analytics" className="block p-2 rounded hover:bg-gray-100">Analytics</a>
          <a href="/staff/admin/departments" className="block p-2 rounded hover:bg-gray-100">Departments</a>
        </nav>
      </aside>
      <main className="flex-1 p-6">
        <Routes>
          <Route index element={<Navigate to="queue" replace />} />
          <Route path="queue" element={<div><h2 className="text-xl font-bold">Officer Queue</h2></div>} />
          <Route path="queue/:clusterId" element={<div>Cluster detail</div>} />
          <Route path="review" element={<div><h2 className="text-xl font-bold">Review Tasks</h2></div>} />
          <Route path="review/:taskId" element={<div>Review task detail</div>} />
          <Route path="analytics" element={<div><h2 className="text-xl font-bold">Analytics</h2></div>} />
          <Route path="admin/departments" element={<div><h2 className="text-xl font-bold">Departments</h2></div>} />
          <Route path="admin/categories" element={<div><h2 className="text-xl font-bold">Categories</h2></div>} />
          <Route path="admin/wards" element={<div><h2 className="text-xl font-bold">Wards</h2></div>} />
          <Route path="admin/users" element={<div><h2 className="text-xl font-bold">Users</h2></div>} />
        </Routes>
      </main>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter basename="/staff">
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="/*" element={<DashboardLayout />} />
      </Routes>
    </BrowserRouter>
  );
}
