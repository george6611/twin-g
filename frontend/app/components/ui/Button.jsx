import React, { forwardRef, useCallback } from 'react';
import useAuth from '../../hooks/useAuth';

const VARIANT_CLASSES = {
  primary: 'bg-orange-600 text-white hover:bg-blue-700',
  secondary: 'bg-gray-600 text-white hover:bg-gray-700',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  outline: 'border border-current bg-transparent',
  ghost: 'bg-transparent',
};

const SIZE_CLASSES = {
  sm: 'px-2 py-1 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

const Spinner = () => (
  <svg
    className="animate-spin h-5 w-5 text-current"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
    />
  </svg>
);

const Button = forwardRef(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      requiredRole,
      requiredPermission,
      unauthorizedBehavior = 'disable', // or 'hide'
      className = '',
      type = 'button',
      onClick,
      children,
      ...rest
    },
    ref
  ) => {
    const { hasRole, hasPermission } = useAuth();

    const isAuthorized = useCallback(() => {
      if (requiredRole && !hasRole(requiredRole)) return false;
      if (requiredPermission && !hasPermission(requiredPermission)) return false;
      return true;
    }, [requiredRole, requiredPermission, hasRole, hasPermission]);

    const authorized = isAuthorized();
    if (!authorized && unauthorizedBehavior === 'hide') {
      return null;
    }

    const isDisabled = disabled || loading || !authorized;

    const handleClick = async (e) => {
      if (isDisabled) {
        e.preventDefault();
        return;
      }
      if (onClick) {
        const result = onClick(e);
        // if user returned a promise we could manage loading state internally but
        // this component relies on `loading` prop for spinners
        return result;
      }
    };

    const baseClasses =
      'inline-flex items-center justify-center rounded focus:outline-none focus:ring';

    const variantClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary;
    const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
    const disabledClass = isDisabled ? 'opacity-50 cursor-not-allowed' : '';

    return (
      <button
        ref={ref}
        type={type}
        className={`${baseClasses} ${variantClass} ${sizeClass} ${disabledClass} ${className}`}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        onClick={handleClick}
        {...rest}
      >
        {loading ? <Spinner /> : children}
      </button>
    );
  }
);

export default Button;
