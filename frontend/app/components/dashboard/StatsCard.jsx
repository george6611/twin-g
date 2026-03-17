import React from 'react';

export default function StatsCard({ title, value, className = '', accent = 'gray' }) {
  const colorClass = accent === 'orange' ? 'text-orange-600' : accent === 'red' ? 'text-red-600' : 'text-gray-900';
  return (
    <div className={`bg-white dark:bg-gray-800 shadow rounded p-4 flex flex-col ${className}`}> 
      <span className="text-sm text-gray-500 dark:text-gray-400">{title}</span>
      <span className={`text-2xl font-semibold mt-1 ${colorClass}`}>{value}</span>
    </div>
  );
}
