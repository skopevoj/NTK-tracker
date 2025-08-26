import React from 'react';

export default function Button({ children, className = '', type = 'button', style = {}, ...props }) {
  return (
    <button
      type={type}
      {...props}
      className={
        `inline-flex items-center justify-center rounded-md text-sm font-medium px-3 py-2 border
         shadow-sm transition-colors duration-150 hover:shadow-md focus:shadow-outline ${className}`
      }
      style={{
        backgroundColor: 'var(--glass)',
        borderColor: 'rgba(255,255,255,0.06)',
        color: 'var(--text)',
        ...(style || {}),
      }}
    >
      {children}
    </button>
  );
}
