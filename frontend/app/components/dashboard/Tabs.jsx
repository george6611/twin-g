import React from 'react';
import Link from 'next/link';

export default function Tabs({ tabs = [], activeKey, onChange }) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => {
          const active = tab.key === activeKey;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={
                `whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ` +
                (active
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')
              }
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
