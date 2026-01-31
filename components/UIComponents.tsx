import React from 'react';
import { X } from './Icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  theme?: 'dark' | 'light';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, theme = 'dark' }) => {
  if (!isOpen) return null;
  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className={`${isDark ? 'bg-surface border-slate-700' : 'bg-white border-slate-200'} w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in duration-200`}>
        <div className={`flex justify-between items-center p-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{title}</h3>
          <button onClick={onClose} className={`p-1 rounded-full transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'}`}>
            <X size={20} />
          </button>
        </div>
        <div className="p-4 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  theme?: 'dark' | 'light';
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, className, theme = 'dark', icon, ...props }) => {
  const isDark = theme === 'dark';
  return (
    <div className="mb-4">
      <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{label}</label>
      <div className="relative">
        {icon && (
          <div className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {icon}
          </div>
        )}
        <input
          className={`w-full rounded-lg py-2 border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'} ${icon ? 'pl-10 pr-3' : 'px-3'} ${className}`}
          {...props}
        />
      </div>
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  theme?: 'dark' | 'light';
}

export const Select: React.FC<SelectProps> = ({ label, children, className, theme = 'dark', ...props }) => {
  const isDark = theme === 'dark';
  return (
    <div className="mb-4">
      <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{label}</label>
      <select
        className={`w-full rounded-lg px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'} ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  theme?: 'dark' | 'light';
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className, theme = 'dark', ...props }) => {
  const isDark = theme === 'dark';
  const baseStyles = "px-4 py-2 rounded-lg font-medium transition-all active:scale-95 flex items-center justify-center gap-2";

  const variants = {
    primary: "bg-primary hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20",
    secondary: isDark ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-slate-200 hover:bg-slate-300 text-slate-800",
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50",
    ghost: isDark ? "bg-transparent hover:bg-slate-800 text-slate-300" : "bg-transparent hover:bg-slate-100 text-slate-600"
  };

  return (
    <button type="button" className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};