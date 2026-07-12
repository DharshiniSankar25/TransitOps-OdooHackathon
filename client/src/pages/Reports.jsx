import { useEffect, useState } from 'react';
import api from '../utils/api';

export default function Reports() {
  const [analytics, setAnalytics] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [fuelForm, setFuelForm] = useState({ vehicle_id: '', liters: '', cost: '' });
  const [expenseForm, setExpenseForm] = useState({ vehicle_id: '', type: '', amount: '', notes: '' });

  const loadData = async () => {
    const [analyticsRes, vehiclesRes] = await Promise.all([
      api.get('/reports/analytics'),
      api.get('/vehicles'),
    ]);
    setAnalytics(analyticsRes.data);
    setVehicles(vehiclesRes.data);
  };

  useEffect(() => { loadData(); }, []);

  const handleFuelSubmit = async (e) => {
    e.preventDefault();
    await api.post('/fuel-logs', fuelForm);
    setFuelForm({ vehicle_id: '', liters: '', cost: '' });
    loadData();
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    await api.post('/expenses', expenseForm);
    setExpenseForm({ vehicle_id: '', type: '', amount: '', notes: '' });
    loadData();
  };

  const exportCSV = () => {
    const headers = ['Vehicle', 'Registration', 'Fuel Efficiency (km/L)', 'Operational Cost', 'ROI (%)'];
    const rows = analytics.map(a => [a.vehicle, a.registration_number, a.fuelEfficiency, a.operationalCost, a.roi]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'transitops_report.csv';
    link.click();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Reports & Analytics</h1>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <form onSubmit={handleFuelSubmit} className="bg-gray-50 p-4 rounded-lg space-y-2">
          <h3 className="font-semibold">Log Fuel</h3>
          <select value={fuelForm.vehicle_id} onChange={e => setFuelForm({...fuelForm, vehicle_id: e.target.value})} className="border p-2 rounded w-full" required>
            <option value="">Select Vehicle</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <input type="number" placeholder="Liters" value={fuelForm.liters} onChange={e => setFuelForm({...fuelForm, liters: e.target.value})} className="border p-2 rounded w-full" required />
          <input type="number" placeholder="Cost" value={fuelForm.cost} onChange={e => setFuelForm({...fuelForm, cost: e.target.value})} className="border p-2 rounded w-full" required />
          <button className="bg-blue-600 text-white p-2 rounded w-full hover:bg-blue-700">Add Fuel Log</button>
        </form>

        <form onSubmit={handleExpenseSubmit} className="bg-gray-50 p-4 rounded-lg space-y-2">
          <h3 className="font-semibold">Log Expense</h3>
          <select value={expenseForm.vehicle_id} onChange={e => setExpenseForm({...expenseForm, vehicle_id: e.target.value})} className="border p-2 rounded w-full" required>
            <option value="">Select Vehicle</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <input placeholder="Type (toll, misc...)" value={expenseForm.type} onChange={e => setExpenseForm({...expenseForm, type: e.target.value})} className="border p-2 rounded w-full" required />
          <input type="number" placeholder="Amount" value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})} className="border p-2 rounded w-full" required />
          <button className="bg-blue-600 text-white p-2 rounded w-full hover:bg-blue-700">Add Expense</button>
        </form>
      </div>

      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold">Vehicle Analytics</h3>
        <button onClick={exportCSV} className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900">Export CSV</button>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2">Vehicle</th>
            <th className="p-2">Fuel Efficiency (km/L)</th>
            <th className="p-2">Operational Cost</th>
            <th className="p-2">ROI (%)</th>
          </tr>
        </thead>
        <tbody>
          {analytics.map((a, i) => (
            <tr key={i} className="border-b">
              <td className="p-2">{a.vehicle} ({a.registration_number})</td>
              <td className="p-2">{a.fuelEfficiency}</td>
              <td className="p-2">₹{a.operationalCost}</td>
              <td className="p-2">{a.roi}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}