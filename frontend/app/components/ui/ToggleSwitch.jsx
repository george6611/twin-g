import React from 'react';

export default function ToggleSwitch({ checked, onChange, disabled, className = '' }) {
  return (
    <label className={`inline-flex items-center cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <span className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange && onChange(e.target.checked)}
          disabled={disabled}
        />
        <div className="w-10 h-4 bg-gray-200 rounded-full shadow-inner"></div>
        <div
          className={`dot absolute w-6 h-6 bg-white rounded-full shadow -left-1 -top-1 transition ${checked ? 'translate-x-full bg-orange-500' : ''}`}
        ></div>
      </span>
      <span className="ml-3 text-sm">{checked ? 'On' : 'Off'}</span>
    </label>
  );
}
