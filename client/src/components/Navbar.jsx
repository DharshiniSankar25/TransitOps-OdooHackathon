import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  if (!user) return null;

  const links = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/vehicles', label: 'Vehicles' },
    { to: '/drivers', label: 'Drivers' },
    { to: '/trips', label: 'Trips' },
    { to: '/maintenance', label: 'Maintenance' },
    { to: '/reports', label: 'Reports' },
  ];

  return (
    <nav className="bg-gray-900 text-white px-6 py-3 flex justify-between items-center">
      <div className="flex gap-6">
        <span className="font-bold text-lg">TransitOps</span>
        {links.map(l => (
          <Link key={l.to} to={l.to} className="hover:text-blue-400 text-sm">{l.label}</Link>
        ))}
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span>{user.name} ({user.role})</span>
        <button onClick={handleLogout} className="bg-red-600 px-3 py-1 rounded hover:bg-red-700">Logout</button>
      </div>
    </nav>
  );
}