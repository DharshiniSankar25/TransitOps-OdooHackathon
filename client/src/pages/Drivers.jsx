import { useEffect, useState } from 'react';
import api from '../utils/api';
import StatusBadge from '../components/StatusBadge';

const emptyForm = {
  name: '', license_number: '', license_category: '', license_expiry_date: '', contact_number: ''
};

export default function Drivers() {
  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadDrivers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/drivers');
      setDrivers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDrivers(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/drivers', form);
      setForm(emptyForm);
      setShowForm(false);
      loadDrivers();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add driver');
    } finally {
      setSubmitting(false);
    }
  };

  const isExpiringSoon = (dateStr) => {
    if (!dateStr) return false;
    const days = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 30;
  };
  const isExpired = (dateStr) => dateStr && new Date(dateStr) < new Date();

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-semibold text-2xl text-ink">Driver Management</h1>
          <p className="text-sm text-muted mt-1">Profiles, license status, and safety scores</p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="bg-accent text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:brightness-95 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
        >
          {showForm ? 'Close' : '+ Add Driver'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} noValidate className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Full Name" name="name" value={form.name} onChange={handleChange} required />
            <Field label="License Number" name="license_number" value={form.license_number} onChange={handleChange} required mono />
            <Field label="License Category" name="license_category" value={form.license_category} onChange={handleChange} placeholder="e.g. LMV, HMV" />
            <Field label="License Expiry Date" name="license_expiry_date" type="date" value={form.license_expiry_date} onChange={handleChange} required />
            <Field label="Contact Number" name="contact_number" value={form.contact_number} onChange={handleChange} />
          </div>
          {error && <p role="alert" className="text-sm text-status-danger bg-red-50 px-3 py-2 rounded-lg mt-4">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="mt-5 bg-navy text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-navy-light transition disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {submitting ? 'Saving…' : 'Save Driver'}
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-muted">Loading drivers…</p>
        ) : drivers.length === 0 ? (
          <p className="p-6 text-sm text-muted">No drivers added yet. Add your first driver to get started.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-gray-100">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">License No.</th>
                <th className="px-5 py-3 font-medium">Expiry</th>
                <th className="px-5 py-3 font-medium">Safety Score</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map(d => (
                <tr key={d.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                  <td className="px-5 py-3.5">{d.name}</td>
                  <td className="px-5 py-3.5 font-mono text-xs">{d.license_number}</td>
                  <td className="px-5 py-3.5">
                    <span className={isExpired(d.license_expiry_date) ? 'text-status-danger font-medium' : isExpiringSoon(d.license_expiry_date) ? 'text-status-pending font-medium' : 'text-muted'}>
                      {d.license_expiry_date ? new Date(d.license_expiry_date).toLocaleDateString() : '—'}
                      {isExpired(d.license_expiry_date) && ' (Expired)'}
                      {!isExpired(d.license_expiry_date) && isExpiringSoon(d.license_expiry_date) && ' (Expiring soon)'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">{d.safety_score}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={d.status} /></td>
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