'use client';

import { useState } from 'react';

/**
 * Tabs Component
 * Manages tabbed navigation with orange theme
 * 
 * @param {Object} props
 * @param {Array} props.tabs - Array of { id, label, icon? }
 * @param {string} props.activeTab - Currently active tab ID
 * @param {function} props.onTabChange - Callback when tab changes
 * @param {ReactNode} props.children - Tab content
 */
export default function Tabs({ tabs, activeTab, onTabChange, children }) {
  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-orange-600 text-orange-600 dark:text-orange-500'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
            }`}
          >
            {tab.icon && <span className="mr-2">{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {children}
      </div>
    </div>
  );
}
