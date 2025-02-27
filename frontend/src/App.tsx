import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/admin/Dashboard'
import Layout from './components/Layout'
import VirtualMachines from './pages/VirtualMachines'
import CreateVM from './pages/CreateVM'
import ViewVM from './pages/ViewVM'
import VMConsole from './pages/VMConsole'
import Templates from './pages/admin/Templates'
import Users from './pages/admin/Users'
import CreateTemplate from './pages/admin/CreateTemplate'
import ViewTemplate from './pages/admin/ViewTemplate'

function App() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={user ? <Layout /> : <Navigate to="/login" />}
      >
        <Route index element={<Dashboard />} />
        <Route path="vms" element={<VirtualMachines />} />
        <Route path="vms/create" element={<CreateVM />} />
        <Route path="vms/:id" element={<ViewVM />} />
        <Route path="vms/:id/console" element={<VMConsole />} />
        
        {/* Admin routes */}
        {user?.role === 'admin' && (
          <>
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="admin/templates" element={<Templates />} />
            <Route path="admin/templates/create" element={<CreateTemplate />} />
            <Route path="admin/templates/:id" element={<ViewTemplate />} />
            <Route path="admin/users" element={<Users />} />
          </>
        )}
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default App