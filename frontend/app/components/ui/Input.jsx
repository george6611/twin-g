import React, { forwardRef, useState, useEffect, useCallback, useMemo } from 'react';
import useAuth from '../../hooks/useAuth';

function sanitizeString(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[<>]/g, '');
}

const Input = forwardRef((props, ref) => {
  const {
    label,
    name,
    type = 'text',
    placeholder = '',
    required = false,
    disabled = false,
    readOnly = false,
    textarea = false,
    rows = 3,
    minLength,
    maxLength,
    pattern,
    validate, // custom function (value) => string|null
    showValidationOnChange = false,
    showValidationOnBlur = true,
    helperText,
    leftIcon,
    rightIcon,
    requiredPermission,
    requiredRole,
    unauthorizedBehavior = 'disable', // or 'hide'
    className = '',
    onChange,
    value: controlledValue,
    defaultValue,
    ...rest
  } = props;

  const { hasRole, hasPermission } = useAuth();

  const isAuthorized = useMemo(() => {
    if (requiredRole && !hasRole(requiredRole)) return false;
    if (requiredPermission && !hasPermission(requiredPermission)) return false;
    return true;
  }, [requiredRole, requiredPermission, hasRole, hasPermission]);

  if (!isAuthorized && unauthorizedBehavior === 'hide') return null;

  const [internalValue, setInternalValue] = useState(
    controlledValue ?? defaultValue ?? ''
  );
  const isControlled = controlledValue !== undefined;

  // validation state
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isControlled) setInternalValue(controlledValue ?? '');
  }, [controlledValue, isControlled]);

  const runValidation = useCallback(
    (val) => {
      // basic required
      if (required && (val === '' || val === null || val === undefined)) {
        return 'This field is required.';
      }
      if (minLength && typeof val === 'string' && val.length < minLength) {
        return `Minimum length is ${minLength}.`;
      }
      if (maxLength && typeof val === 'string' && val.length > maxLength) {
        return `Maximum length is ${maxLength}.`;
      }
      if (pattern && typeof val === 'string') {
        const re = pattern instanceof RegExp ? pattern : new RegExp(pattern);
        if (!re.test(val)) return 'Invalid format.';
      }
      if (typeof validate === 'function') {
        try {
          const custom = validate(val);
          if (typeof custom === 'string' && custom) return custom;
        } catch (e) {
          // Never expose exception details to UI
          return 'Validation error.';
        }
      }
      return null;
    },
    [required, minLength, maxLength, pattern, validate]
  );

  useEffect(() => {
    // initial validation if controlled and showValidationOnChange
    if (showValidationOnChange && isControlled) {
      setError(runValidation(internalValue));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = useCallback(
    (e) => {
      const raw = e.target.value;
      const safe = sanitizeString(raw);
      if (!isControlled) setInternalValue(safe);
      if (typeof onChange === 'function') onChange(e);
      if (showValidationOnChange) {
        setError(runValidation(safe));
      }
    },
    [isControlled, onChange, runValidation, showValidationOnChange]
  );

  const handleBlur = useCallback(
    (e) => {
      setTouched(true);
      if (showValidationOnBlur) {
        const raw = e.target.value;
        const safe = sanitizeString(raw);
        setError(runValidation(safe));
      }
      if (props.onBlur) props.onBlur(e);
    },
    [runValidation, showValidationOnBlur, props]
  );

  const togglePassword = useCallback(() => {
    setShowPassword((s) => !s);
  }, []);

  const inputType = useMemo(() => {
    if (type === 'password') return showPassword ? 'text' : 'password';
    if (type === 'tel') return 'tel';
    if (type === 'number') return 'number';
    if (type === 'date') return 'date';
    return 'text';
  }, [type, showPassword]);

  const finalDisabled = disabled || !isAuthorized || readOnly;

  const baseClasses =
    'w-full bg-white dark:bg-gray-800 border rounded px-3 py-2 text-sm focus:outline-none focus:ring';
  const errorClasses = error ? 'border-red-500' : 'border-gray-300 dark:border-gray-700';
  const disabledClasses = finalDisabled ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium mb-1">
          {sanitizeString(label)}{required ? ' *' : ''}
        </label>
      )}

      <div className={`relative flex ${textarea ? 'flex-col' : 'items-center'} ${disabledClasses}`}>
        {leftIcon && <div className="absolute left-3 pointer-events-none">{leftIcon}</div>}

        {textarea ? (
          <textarea
            ref={ref}
            id={name}
            name={name}
            placeholder={sanitizeString(placeholder)}
            value={internalValue}
            onChange={handleChange}
            onBlur={handleBlur}
            required={required}
            disabled={finalDisabled}
            readOnly={readOnly}
            minLength={minLength}
            maxLength={maxLength}
            rows={rows}
            aria-invalid={!!error}
            aria-describedby={error ? `${name}-error` : helperText ? `${name}-help` : undefined}
            className={`${baseClasses} ${errorClasses} ${finalDisabled ? 'bg-gray-100' : ''}`}
            {...rest}
          />
        ) : (
          <input
            ref={ref}
            id={name}
            name={name}
            type={inputType}
            placeholder={sanitizeString(placeholder)}
            value={internalValue}
            onChange={handleChange}
            onBlur={handleBlur}
            required={required}
            disabled={finalDisabled}
            readOnly={readOnly}
            minLength={minLength}
            maxLength={maxLength}
            aria-invalid={!!error}
            aria-describedby={error ? `${name}-error` : helperText ? `${name}-help` : undefined}
            className={`${baseClasses} ${errorClasses} ${finalDisabled ? 'bg-gray-100' : ''} ${leftIcon ? 'pl-10' : ''} ${rightIcon ? 'pr-10' : ''}`}
            {...rest}
          />
        )}

        {type === 'password' && (
          <button
            type="button"
            onClick={togglePassword}
            className="absolute right-2 text-sm text-gray-600"
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        )}

        {rightIcon && <div className="absolute right-3 pointer-events-none">{rightIcon}</div>}
      </div>

      <div className="mt-1 min-h-[1rem]">
        {error ? (
          <p id={`${name}-error`} className="text-sm text-red-600">
            {sanitizeString(error)}
          </p>
        ) : helperText ? (
          <p id={`${name}-help`} className="text-sm text-gray-500">
            {sanitizeString(helperText)}
          </p>
        ) : null}
      </div>
    </div>
  );
});

export default Input;
