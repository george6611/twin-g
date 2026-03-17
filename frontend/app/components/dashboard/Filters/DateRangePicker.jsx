import React from 'react';

export default function DateRangePicker({ start, end, onChange }) {
  return (
    <div className="flex gap-2 items-center">
      <input
        type="date"
        value={start || ''}
        onChange={(e) => onChange({ start: e.target.value, end })}
        className="border rounded px-2 py-1"
      />
      <span>to</span>
      <input
        type="date"
        value={end || ''}
        onChange={(e) => onChange({ start, end: e.target.value })}
        className="border rounded px-2 py-1"
      />
    </div>
  );
}
