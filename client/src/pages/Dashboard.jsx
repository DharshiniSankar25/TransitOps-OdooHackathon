import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../utils/api';

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard/kpis')
      .then(res => setKpis(res.data))
      .catch(() => setError('Could not load dashboard data. Backend may be offline.'));
  }, []);

  const cards = kpis ? [
    { label: 'Active Vehicles', value: kpis.activeVehicles },
    { label: 'Available Vehicles', value: kpis.availableVehicles },
    { label: 'In Maintenance', value: kpis.inMaintenance },
    { label: 'Active Trips', value: kpis.activeTrips },
    { label: 'Pending Trips', value: kpis.pendingTrips },
    { label: 'Drivers On Duty', value: kpis.driversOnDuty },
    { label: 'Fleet Utilization', value: `${kpis.fleetUtilization}%`, accent: true },
  ] : [];

  const chartData = kpis ? [
    { name: 'Available', value: kpis.availableVehicles },
    { name: 'In Shop', value: kpis.inMaintenance },
    { name: 'Active Trips', value: kpis.activeTrips },
    { name: 'Pending Trips', value: kpis.pendingTrips },
  ] : [];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display font-semibold text-2xl text-ink">Dashboard</h1>
        <p className="text-sm text-muted mt-1">Fleet-wide operational overview</p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-status-danger bg-red-50 px-4 py-3 rounded-lg mb-6">
          {error}
        </p>
      )}

      {!kpis && !error && (
        <div className="grid grid-cols-4 gap-4 mb-8" aria-live="polite" aria-busy="true">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 h-[76px] animate-pulse" />
          ))}
        </div>
      )}

      {kpis && (
        <>
          <div className="grid grid-cols-4 gap-4 mb-8">
            {cards.map((c, i) => (
              <div
                key={i}
                className={`rounded-xl border p-4 ${c.accent ? 'bg-navy border-navy text-white' : 'bg-white border-gray-200'}`}
              >
                <p className={`text-xs mb-1 ${c.accent ? 'text-white/60' : 'text-muted'}`}>{c.label}</p>
                <p className="font-display font-semibold text-2xl">{c.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-display font-semibold text-sm text-ink mb-4">Fleet Overview</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F2" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#5B6B79' }} axisLine={{ stroke: '#EEF0F2' }} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#5B6B79' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #EEF0F2', fontSize: 13 }}
                  cursor={{ fill: '#F6F7F9' }}
                />
                <Bar dataKey="value" fill="#E8630A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}