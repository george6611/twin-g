import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const COLORS = {
  success: 'bg-green-50 border-green-200 text-green-900',
  error: 'bg-red-50 border-red-200 text-red-900',
  info: 'bg-orange-50 border-orange-200 text-orange-900',
};

export default function Toast({ open, type = 'info', message, onClose, autoHideMs = 3000 }) {
  useEffect(() => {
    if (!open || !autoHideMs) return;
    const timeout = setTimeout(() => onClose?.(), autoHideMs);
    return () => clearTimeout(timeout);
  }, [open, autoHideMs, onClose]);

  if (!open || !message) return null;

  const Icon = ICONS[type] || ICONS.info;

  return (
    <div className="fixed top-4 right-4 z-[70]">
      <div className={`max-w-sm rounded-lg border px-4 py-3 shadow-lg ${COLORS[type] || COLORS.info}`}>
        <div className="flex items-start gap-2">
          <Icon className="w-5 h-5 mt-0.5" />
          <div className="text-sm font-medium flex-1">{message}</div>
          <button onClick={onClose} className="text-current/70 hover:text-current" aria-label="Close toast">
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
