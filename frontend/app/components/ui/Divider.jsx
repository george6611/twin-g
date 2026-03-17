import React from 'react';

export default function Divider({ className = '' }) {
  return <hr className={`border-0 border-t border-gray-200 dark:border-gray-700 ${className}`} />;
}
