import React from 'react';

export default function Card({
  children,
  className = '',
  interactive = false,
  hover = true
}) {
  return (
    <div
      className={`card ${interactive ? 'card-interactive' : ''} ${hover ? '' : 'hover:shadow-none'} ${className}`}
    >
      {children}
    </div>
  );
}
