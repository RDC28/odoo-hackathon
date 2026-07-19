import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import OrgRegister from './pages/OrgRegister'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import OfferRide from './pages/OfferRide'
import FindRide from './pages/FindRide'
import MyTrips from './pages/MyTrips'
import TripDetail from './pages/TripDetail'
import TrackRide from './pages/TrackRide'
import Payment from './pages/Payment'
import RideHistory from './pages/RideHistory'
import MyVehicle from './pages/MyVehicle'
import Wallet from './pages/Wallet'
import Transactions from './pages/Transactions'
import DriverFeedback from './pages/DriverFeedback'
import SavedPlaces from './pages/SavedPlaces'
import Chat from './pages/Chat'
import Settings from './pages/Settings'
import AdminLayout from './pages/admin/AdminLayout'
import AdminOverview from './pages/admin/AdminOverview'
import AdminEmployees from './pages/admin/AdminEmployees'
import AdminVehicles from './pages/admin/AdminVehicles'
import AdminSettings from './pages/admin/AdminSettings'
import SuperAdminLayout from './pages/superadmin/SuperAdminLayout'
import SuperAdminOverview from './pages/superadmin/SuperAdminOverview'
import SuperAdminOrganizations from './pages/superadmin/SuperAdminOrganizations'

function RequireAuth({ children, role }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (role === 'admin' && user.role !== 'admin') return <Navigate to="/app" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/register-org" element={<OrgRegister />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/superadmin" element={<RequireAuth role="superadmin"><SuperAdminLayout /></RequireAuth>}>
            <Route index element={<Navigate to="overview" />} />
            <Route path="overview" element={<SuperAdminOverview />} />
            <Route path="organizations" element={<SuperAdminOrganizations />} />
          </Route>
          <Route path="/app" element={<RequireAuth><Layout /></RequireAuth>}>
            <Route index element={<Dashboard />} />
            <Route path="offer" element={<OfferRide />} />
            <Route path="find" element={<FindRide />} />
            <Route path="trips" element={<MyTrips />} />
            <Route path="trips/:id" element={<TripDetail />} />
            <Route path="trips/:id/track" element={<TrackRide />} />
            <Route path="trips/:id/pay" element={<Payment />} />
            <Route path="history" element={<RideHistory />} />
            <Route path="vehicles" element={<MyVehicle />} />
            <Route path="wallet" element={<Wallet />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="feedback" element={<DriverFeedback />} />
            <Route path="places" element={<SavedPlaces />} />
            <Route path="chat" element={<Chat />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="/admin" element={<RequireAuth role="admin"><AdminLayout /></RequireAuth>}>
            <Route index element={<AdminOverview />} />
            <Route path="employees" element={<AdminEmployees />} />
            <Route path="vehicles" element={<AdminVehicles />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
