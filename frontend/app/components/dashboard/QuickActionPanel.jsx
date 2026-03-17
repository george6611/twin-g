import React from 'react';

export default function QuickActionPanel({ actions = [], stickyMobile = true }) {
  return (
    <div className={stickyMobile ? 'sticky bottom-0 sm:static z-30' : ''}>
      <div className="rounded-xl border border-orange-200 dark:border-orange-900/40 bg-white dark:bg-gray-800 p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <button
              key={action.key}
              onClick={action.onClick}
              disabled={action.disabled}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${action.className || 'bg-orange-600 text-white hover:bg-orange-700'} ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
