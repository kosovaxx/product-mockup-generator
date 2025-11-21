import React from 'react';

interface OptionGroupProps {
  title: string;
  children: React.ReactNode;
}

export const OptionGroup: React.FC<OptionGroupProps> = ({ title, children }) => {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-600">{title}</h3>
      <div>{children}</div>
    </div>
  );
};