import React from 'react';
import { Clock4 } from 'lucide-react';

function getDateValue(event) {
  return event.timestamp || event.createdAt || event.date || event.time;
}

export default function ActivityFeed({ entries = [] }) {
  if (!entries.length) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No activity entries available.</p>;
  }

  return (
    <ul className="space-y-3">
      {entries.map((entry, index) => {
        const dateValue = getDateValue(entry);
        const when = dateValue ? new Date(dateValue).toLocaleString() : 'Unknown time';
        return (
          <li
            key={entry.id || entry._id || `${entry.action || 'entry'}-${index}`}
            className="rounded-lg border border-orange-100 dark:border-orange-900/40 bg-white dark:bg-gray-800 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">{entry.action || entry.title || 'Activity'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">By {entry.userName || entry.user || 'System'}</p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Clock4 className="w-3.5 h-3.5" />
                {when}
              </span>
            </div>
            {entry.note || entry.description ? (
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{entry.note || entry.description}</p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
