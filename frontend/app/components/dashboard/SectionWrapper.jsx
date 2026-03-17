import React from 'react';

export default function SectionWrapper({ title, subtitle, children }) {
  return (
    <section className="bg-white dark:bg-gray-800 rounded shadow p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
      </div>
      <div>{children}</div>
    </section>
  );
}
