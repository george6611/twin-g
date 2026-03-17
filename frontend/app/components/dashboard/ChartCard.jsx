import React from 'react';

// simple wrapper for chart elements
export default function ChartCard({ title, children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-gray-800 shadow rounded p-4 ${className}`}> 
      {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
      <div className="w-full h-64 overflow-auto">
        {children || <div className="text-center text-gray-500">Chart placeholder</div>}
      </div>
    </div>
  );
}
