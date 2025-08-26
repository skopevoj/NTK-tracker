import React from 'react';

export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-lg p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}
