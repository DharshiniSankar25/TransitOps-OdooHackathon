import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import Drivers from './pages/Drivers';
import Trips from './pages/Trips';
import Maintenance from './pages/Maintenance';
import Reports from './pages/Reports';

function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main id="main-content" className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg">
        Skip to content
      </a>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/vehicles" element={<ProtectedRoute><Layout><Vehicles /></Layout></ProtectedRoute>} />
        <Route path="/drivers" element={<ProtectedRoute><Layout><Drivers /></Layout></ProtectedRoute>} />
        <Route path="/trips" element={<ProtectedRoute><Layout><Trips /></Layout></ProtectedRoute>} />
        <Route path="/maintenance" element={<ProtectedRoute><Layout><Maintenance /></Layout></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><Layout><Reports /></Layout></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;