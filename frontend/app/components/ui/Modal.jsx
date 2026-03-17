import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import useAuth from '../../hooks/useAuth';

const SIZES = {
  sm: 'max-w-lg',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
};

function useLockBodyScroll(isActive) {
  useEffect(() => {
    if (!isActive) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [isActive]);
}

function Modal({
  isOpen,
  onClose,
  children,
  closeOnOverlayClick = true,
  size = 'md',
  ariaLabel = 'Dialog',
  footer,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  showCloseButton = true,
  requiredPermission,
  requiredRole,
  unauthorizedFallback = null, // optional fallback content when unauthorized
}) {
  const { hasRole, hasPermission } = useAuth();

  const isAuthorized = (() => {
    if (requiredRole && !hasRole(requiredRole)) return false;
    if (requiredPermission && !hasPermission(requiredPermission)) return false;
    return true;
  })();

  const modalRef = useRef(null);
  const lastFocused = useRef(null);

  useLockBodyScroll(isOpen && isAuthorized);

  useEffect(() => {
    if (!isOpen) return;
    lastFocused.current = document.activeElement;
    // focus first focusable element inside modal
    setTimeout(() => {
      if (modalRef.current) {
        const focusable = modalRef.current.querySelectorAll('button, a, input, textarea, select, [tabindex]:not([tabindex="-1"])');
        if (focusable.length) focusable[0].focus();
      }
    }, 0);
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        if (onClose) onClose();
      }
      if (e.key === 'Tab' && modalRef.current) {
        // trap focus
        const focusable = modalRef.current.querySelectorAll(
          'button, a, input, textarea, select, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  useEffect(() => {
    return () => {
      // restore focus
      if (lastFocused.current && typeof lastFocused.current.focus === 'function') {
        lastFocused.current.focus();
      }
    };
  }, []);

  const handleOverlayClick = (e) => {
    if (!closeOnOverlayClick) return;
    if (e.target === e.currentTarget) {
      if (onClose) onClose();
    }
  };

  if (!isOpen) return null;

  if (!isAuthorized) {
    return unauthorizedFallback ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded shadow">{unauthorizedFallback}</div>
      </div>
    ) : null;
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={handleOverlayClick}
    >
      <div className="absolute inset-0 bg-black opacity-40" aria-hidden="true" />

      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={`relative w-full ${SIZES[size] || SIZES.md} mx-auto bg-white dark:bg-gray-800 rounded shadow-lg overflow-hidden transform transition-all`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="p-4">
          {showCloseButton && (
            <button
              onClick={onClose}
              className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
              aria-label="Close dialog"
            >
              ×
            </button>
          )}

          <div className="space-y-4">{children}</div>
        </div>

        {(footer || onConfirm || onCancel) && (
          <div className="border-t p-4 bg-gray-50 dark:bg-gray-900 flex justify-end gap-2">
            {onCancel && (
              <button
                className="px-4 py-2 bg-gray-200 rounded"
                onClick={() => {
                  if (onCancel) onCancel();
                  if (onClose) onClose();
                }}
              >
                {cancelLabel}
              </button>
            )}

            {onConfirm && (
              <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={onConfirm}>
                {confirmLabel}
              </button>
            )}

            {footer}
          </div>
        )}
      </div>
    </div>
  );

  const portalRoot = typeof window !== 'undefined' ? document.body : null;
  return portalRoot ? createPortal(modalContent, portalRoot) : null;
}

export default Modal;
export { Modal };
