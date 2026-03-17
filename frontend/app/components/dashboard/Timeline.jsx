import React from 'react';

export default function Timeline({ events = [] }) {
  if (!events || events.length === 0) {
    return <div className="text-gray-500">No activity yet.</div>;
  }
  return (
    <ul className="relative border-l border-gray-200 dark:border-gray-700">
      {events.map((evt, idx) => (
        <li key={idx} className="mb-10 ml-6">
          <span className="absolute flex items-center justify-center w-6 h-6 bg-orange-100 rounded-full -left-3 ring-8 ring-white dark:ring-gray-900 dark:bg-orange-900">
            {/* icon placeholder */}
          </span>
          <div className="flex flex-col">
            <span className="text-sm text-gray-500">{new Date(evt.date).toLocaleString()}</span>
            <p className="text-base font-medium text-gray-900 dark:text-white">{evt.title}</p>
            {evt.description && <p className="text-sm text-gray-700 dark:text-gray-300">{evt.description}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
