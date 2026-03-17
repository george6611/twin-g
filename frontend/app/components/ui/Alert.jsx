import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function Alert({
  title = 'Notice',
  message,
  variant = 'warning',
  className = '',
  action,
}) {
  const styles = {
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    error: 'bg-red-50 border-red-200 text-red-900',
    info: 'bg-blue-50 border-blue-200 text-blue-900',
    success: 'bg-green-50 border-green-200 text-green-900',
  };

  return (
    <div className={`rounded-lg border p-4 ${styles[variant] || styles.warning} ${className}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold">{title}</p>
          {message ? <p className="text-sm mt-1">{message}</p> : null}
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}
