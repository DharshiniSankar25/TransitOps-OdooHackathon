import { useEffect, useState } from 'react';
import api from '../utils/api';

export default function Trips() {
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState({
    source: '', destination: '', vehicle_id: '', driver_id: '', cargo_weight: '', planned_distance: ''
  });
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const [tripsRes, vehiclesRes, driversRes] = await Promise.all([
        api.get('/trips'),
        api.get('/vehicles'),
        api.get('/drivers'),
      ]);
      setTrips(tripsRes.data);
      setVehicles(vehiclesRes.data.filter(v => v.status === 'Available'));
      setDrivers(driversRes.data.filter(d => d.status === 'Available'));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/trips', form);
      setForm({ source: '', destination: '', vehicle_id: '', driver_id: '', cargo_weight: '', planned_distance: '' });
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create trip');
    }
  };

  const handleAction = async (id, action, extra = {}) => {
    try {
      await api.patch(`/trips/${id}/${action}`, extra);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    }
  };

  const handleComplete = (id) => {
    const actual_distance = prompt('Enter final distance (km):');
    const fuel_consumed = prompt('Enter fuel consumed (liters):');
    if (actual_distance && fuel_consumed) {
      handleAction(id, 'complete', { actual_distance, fuel_consumed });
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Trips</h1>

      <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3 mb-6 bg-gray-50 p-4 rounded-lg">
        <input name="source" placeholder="Source" value={form.source} onChange={handleChange} className="border p-2 rounded" required />
        <input name="destination" placeholder="Destination" value={form.destination} onChange={handleChange} className="border p-2 rounded" required />
        <select name="vehicle_id" value={form.vehicle_id} onChange={handleChange} className="border p-2 rounded" required>
          <option value="">Select Vehicle</option>
          {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.registration_number})</option>)}
        </select>
        <select name="driver_id" value={form.driver_id} onChange={handleChange} className="border p-2 rounded" required>
          <option value="">Select Driver</option>
          {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <input name="cargo_weight" type="number" placeholder="Cargo Weight (kg)" value={form.cargo_weight} onChange={handleChange} className="border p-2 rounded" required />
        <input name="planned_distance" type="number" placeholder="Planned Distance (km)" value={form.planned_distance} onChange={handleChange} className="border p-2 rounded" />
        <button type="submit" className="col-span-2 bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Create Trip (Draft)</button>
        {error && <p className="col-span-2 text-red-500 text-sm">{error}</p>}
      </form>

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2">Route</th>
            <th className="p-2">Vehicle</th>
            <th className="p-2">Driver</th>
            <th className="p-2">Cargo</th>
            <th className="p-2">Status</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {trips.map(t => (
            <tr key={t.id} className="border-b">
              <td className="p-2">{t.source} → {t.destination}</td>
              <td className="p-2">{t.vehicle_name || '-'}</td>
              <td className="p-2">{t.driver_name || '-'}</td>
              <td className="p-2">{t.cargo_weight} kg</td>
              <td className="p-2">
                <span className={`px-2 py-1 rounded text-xs ${
                  t.status === 'Draft' ? 'bg-yellow-100 text-yellow-800' :
                  t.status === 'Dispatched' ? 'bg-blue-100 text-blue-800' :
                  t.status === 'Completed' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>{t.status}</span>
              </td>
              <td className="p-2 space-x-2">
                {t.status === 'Draft' && (
                  <button onClick={() => handleAction(t.id, 'dispatch')} className="text-blue-600 hover:underline">Dispatch</button>
                )}
                {t.status === 'Dispatched' && (
                  <>
                    <button onClick={() => handleComplete(t.id)} className="text-green-600 hover:underline">Complete</button>
                    <button onClick={() => handleAction(t.id, 'cancel')} className="text-red-600 hover:underline">Cancel</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}