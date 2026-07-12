const statusStyles = {
  Available: 'bg-emerald-50 text-emerald-700 before:bg-emerald-500',
  'On Trip': 'bg-blue-50 text-blue-700 before:bg-blue-500',
  'In Shop': 'bg-amber-50 text-amber-700 before:bg-amber-500',
  Retired: 'bg-gray-100 text-gray-600 before:bg-gray-400',
  'Off Duty': 'bg-gray-100 text-gray-600 before:bg-gray-400',
  Suspended: 'bg-red-50 text-red-700 before:bg-red-500',
  Draft: 'bg-amber-50 text-amber-700 before:bg-amber-500',
  Dispatched: 'bg-blue-50 text-blue-700 before:bg-blue-500',
  Completed: 'bg-emerald-50 text-emerald-700 before:bg-emerald-500',
  Cancelled: 'bg-red-50 text-red-700 before:bg-red-500',
};

export default function StatusBadge({ status }) {
  const style = statusStyles[status] || 'bg-gray-100 text-gray-600 before:bg-gray-400';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style} before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full`}>
      {status}
    </span>
  );
}