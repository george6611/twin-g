'use client';

import { useState, useRef } from 'react';
import Button from './Button';

/**
 * FileUpload Component
 * File upload with preview and drag-drop support
 * 
 * @param {Object} props
 * @param {function} props.onFileSelect - Callback when file is selected
 * @param {Array} props.acceptedFormats - File types to accept (e.g., ['image/jpeg', 'image/png'])
 * @param {number} props.maxSizeMB - Max file size in MB
 * @param {string} props.label - Label text
 * @param {string} props.preview - Preview image URL (optional)
 * @param {string} props.previewAlt - Alt text for preview
 * @param {boolean} props.disabled - Disable state
 */
export default function FileUpload({
  onFileSelect,
  acceptedFormats = ['image/*'],
  maxSizeMB = 5,
  label = 'Upload File',
  preview = null,
  previewAlt = 'Preview',
  disabled = false,
}) {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);

  const validateFile = (file) => {
    // Check size
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`File size must be less than ${maxSizeMB}MB`);
      return false;
    }

    // Check format
    const isAccepted = acceptedFormats.some(format => {
      if (format.includes('*')) {
        const [type] = format.split('/');
        return file.type.startsWith(type);
      }
      return file.type === format;
    });

    if (!isAccepted) {
      setError(`File type not accepted. Supported: ${acceptedFormats.join(', ')}`);
      return false;
    }

    return true;
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setDragActive(e.type === 'dragenter' || e.type === 'dragover');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file) => {
    setError(null);
    if (validateFile(file)) {
      onFileSelect(file);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
          {label}
        </label>
      )}

      {/* Preview */}
      {preview && (
        <div className="mb-4 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
          <img
            src={preview}
            alt={previewAlt}
            className="w-full h-40 object-cover"
          />
        </div>
      )}

      {/* Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          disabled
            ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 cursor-not-allowed'
            : dragActive
            ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/10'
            : 'border-gray-300 dark:border-gray-600 hover:border-orange-300 dark:hover:border-orange-900'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleChange}
          accept={acceptedFormats.join(',')}
          disabled={disabled}
          className="hidden"
        />

        <svg
          className="w-8 h-8 mx-auto mb-2 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Drag and drop your file here, or click to browse
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500">
          Max size: {maxSizeMB}MB
        </p>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="mt-4"
        >
          Choose File
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
