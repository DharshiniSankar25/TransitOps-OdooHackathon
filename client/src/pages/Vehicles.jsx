import { useEffect, useState } from 'react';
import api from '../utils/api';
import StatusBadge from '../components/StatusBadge';

const emptyForm = {
  registration_number: '', name: '', type: '', max_load_capacity: '',
  odometer: '', acquisition_cost: '', region: ''
};

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const res = await api.get('/vehicles');
      setVehicles(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadVehicles(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/vehicles', form);
      setForm(emptyForm);
      setShowForm(false);
      loadVehicles();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not register vehicle');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-semibold text-2xl text-ink">Vehicle Registry</h1>
          <p className="text-sm text-muted mt-1">Master list of fleet vehicles</p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="bg-accent text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:brightness-95 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
        >
          {showForm ? 'Close' : '+ Register Vehicle'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} noValidate className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Registration Number" name="registration_number" value={form.registration_number} onChange={handleChange} required mono />
            <Field label="Vehicle Name / Model" name="name" value={form.name} onChange={handleChange} required />
            <Field label="Type" name="type" value={form.type} onChange={handleChange} required placeholder="e.g. Van, Truck" />
            <Field label="Max Load Capacity (kg)" name="max_load_capacity" type="number" value={form.max_load_capacity} onChange={handleChange} required />
            <Field label="Odometer (km)" name="odometer" type="number" value={form.odometer} onChange={handleChange} />
            <Field label="Acquisition Cost" name="acquisition_cost" type="number" value={form.acquisition_cost} onChange={handleChange} required />
            <Field label="Region" name="region" value={form.region} onChange={handleChange} />
          </div>
          {error && <p role="alert" className="text-sm text-status-danger bg-red-50 px-3 py-2 rounded-lg mt-4">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="mt-5 bg-navy text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-navy-light transition disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {submitting ? 'Saving…' : 'Save Vehicle'}
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-muted">Loading vehicles…</p>
        ) : vehicles.length === 0 ? (
          <p className="p-6 text-sm text-muted">No vehicles registered yet. Add your first vehicle to get started.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-gray-100">
                <th className="px-5 py-3 font-medium">Reg. Number</th>
                <th className="px-5 py-3 font-medium">Name / Model</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Max Load</th>
                <th className="px-5 py-3 font-medium">Odometer</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map(v => (
                <tr key={v.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                  <td className="px-5 py-3.5 font-mono text-xs text-ink">{v.registration_number}</td>
                  <td className="px-5 py-3.5">{v.name}</td>
                  <td className="px-5 py-3.5 text-muted">{v.type}</td>
                  <td className="px-5 py-3.5">{v.max_load_capacity} kg</td>
                  <td className="px-5 py-3.5 text-muted">{v.odometer} km</td>
                  <td className="px-5 py-3.5"><StatusBadge status={v.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, type = 'text', required, mono, placeholder }) {
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
        className={`w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent focus:border-accent ${mono ? 'font-mono' : ''}`}
      />
    </div>
  );
}