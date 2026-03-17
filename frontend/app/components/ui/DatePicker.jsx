import React from 'react';

export default function DatePicker({
  value,
  onChange,
  className = '',
  name,
  disabled = false,
  max,
  min,
}) {
  return (
    <input
      type="date"
      name={name}
      value={value || ''}
      onChange={onChange}
      disabled={disabled}
      max={max}
      min={min}
      className={`w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 ${className}`}
    />
  );
}
