import React from 'react';

interface SimpleCardProps {
  children: React.ReactNode;
  className?: string;
}

export function SimpleCard({ children, className = '' }: SimpleCardProps) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function SimpleCardContent({ children, className = '' }: SimpleCardProps) {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  );
}

export function SimpleButton({ 
  children, 
  onClick, 
  disabled = false, 
  className = '' 
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}