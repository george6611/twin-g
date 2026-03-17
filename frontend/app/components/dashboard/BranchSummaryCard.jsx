'use client';

import Button from '../ui/Button';
import Badge from '../ui/Badge';

/**
 * BranchSummaryCard Component
 * Displays summary info for a branch
 * 
 * @param {Object} props
 * @param {Object} props.branch - Branch data
 * @param {function} props.onViewClick - Callback for view button
 * @param {boolean} props.isDefault - Is this the default branch?
 * @param {boolean} props.showViewButton - Show view button
 */
export default function BranchSummaryCard({
  branch,
  onViewClick,
  isDefault = false,
  showViewButton = true,
}) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md dark:hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            {branch.name}
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {branch.location}
          </p>
        </div>
        {isDefault && (
          <Badge variant="success" text="Default" />
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 gap-y-2 mb-3 text-xs">
        <div>
          <span className="text-gray-600 dark:text-gray-400">Manager</span>
          <p className="font-medium text-gray-900 dark:text-white">
            {branch.managerName || '—'}
          </p>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400">Staff</span>
          <p className="font-medium text-gray-900 dark:text-white">
            {branch.staffCount || 0}
          </p>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400">Status</span>
          <p className="font-medium text-gray-900 dark:text-white mt-0.5">
            <Badge
              variant={branch.status === 'active' ? 'success' : 'secondary'}
              text={branch.status === 'active' ? 'Active' : 'Inactive'}
            />
          </p>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400">Orders</span>
          <p className="font-medium text-orange-600 dark:text-orange-400">
            {branch.activeOrders || 0}
          </p>
        </div>
      </div>

      {showViewButton && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onViewClick?.(branch._id)}
          className="w-full"
        >
          View Details
        </Button>
      )}
    </div>
  );
}
