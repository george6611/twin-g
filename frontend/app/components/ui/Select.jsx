import React from 'react';

export default function Select({
  value,
  onChange,
  options = [],
  placeholder = 'Select option',
  className = '',
  disabled = false,
  name,
}) {
  return (
    <select
      name={name}
      value={value ?? ''}
      onChange={onChange}
      disabled={disabled}
      className={`w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 ${className}`}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => {
        const optionValue = option.value ?? option.id;
        const optionLabel = option.label ?? option.name ?? String(optionValue ?? '');
        return (
          <option key={String(optionValue)} value={optionValue}>
            {optionLabel}
          </option>
        );
      })}
    </select>
  );
}
