import React from 'react';

export default function Table({ columns = [], data = [] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white dark:bg-gray-800">
        <thead>
          <tr className="bg-orange-100">
            {columns.map((col) => (
              <th key={col.key} className="py-2 px-4 text-left">
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => {
            const rowKey = row?.id || row?._id || row?.key || `${index}-${JSON.stringify(row)}`;
            return (
            <tr key={rowKey} className="border-b">
              {columns.map((col) => (
                <td key={col.key} className="py-2 px-4">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          )})}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="py-4 text-center text-gray-500">
                No records
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
