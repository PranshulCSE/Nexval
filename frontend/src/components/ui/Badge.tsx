import React from 'react';

export type BadgeVariant = 'yellow' | 'blue' | 'green' | 'gray' | 'red';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'gray',
  className = '',
  dot = false,
}) => {
  const variantStyles: Record<BadgeVariant, { container: string; dotColor: string }> = {
    yellow: {
      container: 'bg-[#FEF9C3] text-[#854D0E] border-[#FEF08A]',
      dotColor: 'bg-[#CA8A04]'
    },
    blue: {
      container: 'bg-[#EFF6FF] text-[#1E40AF] border-[#DBEAFE]',
      dotColor: 'bg-[#3B82F6]'
    },
    green: {
      container: 'bg-[#F0FDF4] text-[#166534] border-[#DCFCE7]',
      dotColor: 'bg-[#22C55E]'
    },
    gray: {
      container: 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]',
      dotColor: 'bg-[#94A3B8]'
    },
    red: {
      container: 'bg-[#FEF2F2] text-[#991B1B] border-[#FEE2E2]',
      dotColor: 'bg-[#EF4444]'
    },
  };

  const selected = variantStyles[variant] || variantStyles.gray;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider border ${selected.container} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${selected.dotColor}`} />}
      {children}
    </span>
  );
};
