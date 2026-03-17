import React from 'react';
import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm action',
  message = 'Are you sure you want to continue?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  loading = false,
  danger = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" ariaLabel={title}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={onClose} className="bg-gray-600 hover:bg-gray-700">{cancelText}</Button>
        <Button
          onClick={onConfirm}
          loading={loading}
          className={danger ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}
