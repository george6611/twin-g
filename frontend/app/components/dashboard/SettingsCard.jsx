'use client';

/**
 * SettingsCard Component
 * Card for displaying individual settings/preferences
 * 
 * @param {Object} props
 * @param {string} props.label - Setting label
 * @param {string} props.description - Description text
 * @param {ReactNode} props.control - Control element (checkbox, toggle, input, etc.)
 * @param {string} props.variant - 'default' | 'warning' | 'info'
 */
export default function SettingsCard({
  label,
  description,
  control,
  variant = 'default',
}) {
  const variantStyles = {
    default: 'border-gray-200 dark:border-gray-700',
    warning: 'border-yellow-200 dark:border-yellow-900/30 bg-yellow-50 dark:bg-yellow-900/10',
    info: 'border-blue-200 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-900/10',
  };

  return (
    <div className={`border rounded-lg p-4 ${variantStyles[variant]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            {label}
          </h4>
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {description}
            </p>
          )}
        </div>
        {control && (
          <div className="ml-4">
            {control}
          </div>
        )}
      </div>
    </div>
  );
}
