import React from 'react';

export default function QuickActionButtons({ actions = [] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          key={action.key}
          onClick={action.onClick}
          disabled={action.disabled}
          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${action.className || 'bg-orange-600 hover:bg-orange-700 text-white'} ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {action.icon}
          {action.label}
        </button>
      ))}
    </div>
  );
}
