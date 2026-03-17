"use client"; // for Next.js app router

import React from "react";
import clsx from "clsx"; // optional but great for conditional classes

/**
 * Button component
 * 
 * Props:
 * - variant: 'primary' | 'secondary' | 'danger' | 'outline' (default: 'primary')
 * - size: 'sm' | 'md' | 'lg' (default: 'md')
 * - className: additional tailwind classes
 * - disabled: boolean
 * - type: button | submit | reset (default: 'button')
 * - onClick: function
 * - children: button content
 */
export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
  type = "button",
  onClick,
  children,
  ...props
}) {
  // base styling for all buttons
  const baseStyle = "rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all shadow-sm";

  // variant styles
  const variants = {
    primary: "bg-orange-600 text-white hover:bg-orange-700 focus:ring-orange-500",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-400",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    outline: "border border-gray-300 text-gray-900 hover:bg-gray-100 focus:ring-gray-400",
  };

  // size styles
  const sizes = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-3 text-base",
    lg: "px-6 py-4 text-lg",
  };

  const buttonClass = clsx(baseStyle, variants[variant], sizes[size], disabled && "opacity-50 cursor-not-allowed", className);

  return (
    <button
      type={type}
      className={buttonClass}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}