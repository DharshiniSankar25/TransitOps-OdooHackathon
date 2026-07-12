import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../utils/api';

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);

  useEffect(() => {
    api.get('/dashboard/kpis').then(res => setKpis(res.data)).catch(console.error);
  }, []);

  if (!kpis) return <div className="p-6">Loading dashboard...</div>;

  const chartData = [
    { name: 'Available', value: kpis.availableVehicles },
    { name: 'In Shop', value: kpis.inMaintenance },
    { name: 'Active Trips', value: kpis.activeTrips },
    { name: 'Pending Trips', value: kpis.pendingTrips },
  ];

  const cards = [
    { label: 'Active Vehicles', value: kpis.activeVehicles },
    { label: 'Available Vehicles', value: kpis.availableVehicles },
    { label: 'In Maintenance', value: kpis.inMaintenance },
    { label: 'Active Trips', value: kpis.activeTrips },
    { label: 'Pending Trips', value: kpis.pendingTrips },
    { label: 'Drivers On Duty', value: kpis.driversOnDuty },
    { label: 'Fleet Utilization', value: `${kpis.fleetUtilization}%` },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {cards.map((c, i) => (
          <div key={i} className="bg-white shadow rounded-lg p-4 border">
            <p className="text-sm text-gray-500">{c.label}</p>
            <p className="text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white shadow rounded-lg p-4 border">
        <h3 className="font-semibold mb-2">Fleet Overview</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#2563eb" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}