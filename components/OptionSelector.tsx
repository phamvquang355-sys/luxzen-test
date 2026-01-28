import React from 'react';
import { OptionItem } from '../types';

interface OptionSelectorProps {
  id?: string;
  label: string;
  options: OptionItem[];
  value: string;
  onChange: (value: string) => void;
  variant?: 'select' | 'grid';
}

export const OptionSelector: React.FC<OptionSelectorProps> = ({ label, options, value, onChange, variant = 'select' }) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-luxury-800 uppercase tracking-wider">
        {label}
      </label>
      
      {variant === 'grid' ? (
        <div className="grid grid-cols-2 gap-2">
            {options.map((option) => (
                <button
                    key={option.value}
                    onClick={() => onChange(option.value)}
                    className={`p-3 rounded-lg text-sm font-medium transition-all border ${
                        value === option.value 
                        ? 'bg-luxury-800 text-white border-luxury-800 shadow-md' 
                        : 'bg-white text-luxury-600 border-luxury-200 hover:border-luxury-400 hover:bg-luxury-50'
                    }`}
                >
                    {option.label}
                </button>
            ))}
        </div>
      ) : (
        <div className="relative">
            <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full appearance-none bg-white border border-luxury-300 text-luxury-900 py-3 px-4 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all shadow-sm"
            >
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                {option.label}
                </option>
            ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-luxury-600">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
            </svg>
            </div>
        </div>
      )}
      
      {/* Description display for selected item */}
      <p className="text-xs text-luxury-500 italic h-4">
        {options.find(o => o.value === value)?.description || ''}
      </p>
    </div>
  );
};