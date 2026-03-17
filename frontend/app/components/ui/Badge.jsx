import React from 'react';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
  in_progress: 'bg-purple-100 text-purple-800 border-purple-200',
  out_for_delivery: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  paid: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  unpaid: 'bg-orange-100 text-orange-800 border-orange-200',
};

export default function Badge({ text, tone = 'default', className = '' }) {
  const normalized = String(tone || '').toLowerCase().replace(/\s+/g, '_');
  const color = STATUS_COLORS[normalized] || 'bg-gray-100 text-gray-800 border-gray-200';

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${color} ${className}`}>
      {text}
    </span>
  );
}
