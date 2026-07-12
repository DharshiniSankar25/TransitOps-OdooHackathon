import { useEffect, useState } from 'react';
import api from '../utils/api';
import StatusBadge from '../components/StatusBadge';

export default function Maintenance() {
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState({ vehicle_id: '', description: '', cost: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const vehiclesRes = await api.get('/vehicles');
      setVehicles(vehiclesRes.data);
      // Derive an in-shop-focused view from vehicle status since there's no GET /maintenance list route yet
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await api.post('/maintenance', form);
      setLogs(prev => [res.data, ...prev]);
      setForm({ vehicle_id: '', description: '', cost: '' });
      setShowForm(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create maintenance record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async (id) => {
    try {
      await api.patch(`/maintenance/${id}/close`);
      setLogs(prev => prev.map(l => l.id === id ? { ...l, status: 'Closed' } : l));
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not close maintenance record');
    }
  };

  const availableForMaintenance = vehicles.filter(v => v.status === 'Available');
  const inShopVehicles = vehicles.filter(v => v.status === 'In Shop');

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-semibold text-2xl text-ink">Maintenance</h1>
          <p className="text-sm text-muted mt-1">Vehicles currently in shop are automatically hidden from dispatch</p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="bg-accent text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:brightness-95 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
        >
          {showForm ? 'Close' : '+ New Maintenance Log'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} noValidate className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="vehicle_id" className="block text-xs font-medium text-muted mb-1.5">
                Vehicle <span className="text-status-danger">*</span>
              </label>
              <select
                id="vehicle_id"
                name="vehicle_id"
                value={form.vehicle_id}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent focus:border-accent"
              >
                <option value="">Select vehicle</option>
                {availableForMaintenance.map(v => (
                  <option key={v.id} value={v.id}>{v.name} ({v.registration_number})</option>
                ))}
              </select>
            </div>
            <Field label="Description" name="description" value={form.description} onChange={handleChange} required placeholder="e.g. Oil Change" />
            <Field label="Estimated Cost" name="cost" type="number" value={form.cost} onChange={handleChange} />
          </div>
          {error && <p role="alert" className="text-sm text-status-danger bg-red-50 px-3 py-2 rounded-lg mt-4">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="mt-5 bg-navy text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-navy-light transition disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {submitting ? 'Saving…' : 'Create Log — Vehicle moves to In Shop'}
          </button>
        </form>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <h2 className="font-display font-semibold text-sm text-ink">Currently In Shop</h2>
          </div>
          {loading ? (
            <p className="p-5 text-sm text-muted">Loading…</p>
          ) : inShopVehicles.length === 0 ? (
            <p className="p-5 text-sm text-muted">No vehicles in maintenance right now.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {inShopVehicles.map(v => (
                <li key={v.id} className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{v.name}</p>
                    <p className="text-xs text-muted font-mono">{v.registration_number}</p>
                  </div>
                  <StatusBadge status={v.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <h2 className="font-display font-semibold text-sm text-ink">Recent Logs (this session)</h2>
          </div>
          {logs.length === 0 ? (
            <p className="p-5 text-sm text-muted">No maintenance logs created yet this session.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {logs.map(log => (
                <li key={log.id} className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{log.description}</p>
                    <p className="text-xs text-muted">₹{log.cost || 0}</p>
                  </div>
                  {log.status === 'Open' ? (
                    <button
                      onClick={() => handleClose(log.id)}
                      className="text-xs font-medium text-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent rounded"
                    >
                      Close & restore vehicle
                    </button>
                  ) : (
                    <span className="text-xs text-status-available font-medium">Closed</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, type = 'text', required, placeholder }) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-medium text-muted mb-1.5">
        {label}{required && <span className="text-status-danger"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent focus:border-accent"
      />
    </div>
  );
}