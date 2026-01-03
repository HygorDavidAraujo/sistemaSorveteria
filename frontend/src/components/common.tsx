import React from 'react';
import clsx from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  disabled,
  className,
  ...props
}) => {
  const baseStyles = 'font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = {
    primary: 'bg-primary text-white hover:bg-opacity-90',
    secondary: 'bg-secondary text-white hover:bg-opacity-90',
    danger: 'bg-danger text-white hover:bg-opacity-90',
    success: 'bg-success text-white hover:bg-opacity-90',
    warning: 'bg-warning text-white hover:bg-opacity-90',
  };

  const sizeStyles = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={clsx(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      {...props}
    >
      {isLoading ? '⏳' : children}
    </button>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className, ...props }) => (
  <div className="flex flex-col gap-1">
    {label && <label className="font-semibold text-sm text-dark">{label}</label>}
    <input
      className={clsx(
        'px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary',
        error && 'border-danger',
        !error && 'border-light',
        className
      )}
      {...props}
    />
    {error && <span className="text-danger text-sm">{error}</span>}
  </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string | number; label: string }>;
}

export const Select: React.FC<SelectProps> = ({ label, error, options, className, ...props }) => (
  <div className="flex flex-col gap-1">
    {label && <label className="font-semibold text-sm text-dark">{label}</label>}
    <select
      className={clsx(
        'px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary',
        error && 'border-danger',
        !error && 'border-light',
        className
      )}
      {...props}
    >
      <option value="">Selecione...</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    {error && <span className="text-danger text-sm">{error}</span>}
  </div>
);

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className }) => (
  <div className={clsx('bg-white rounded-lg shadow-md p-6', className)}>
    {children}
  </div>
);

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'primary', className }) => {
  const variantStyles = {
    primary: 'bg-primary bg-opacity-20 text-primary',
    secondary: 'bg-secondary bg-opacity-20 text-secondary',
    danger: 'bg-danger bg-opacity-20 text-danger',
    success: 'bg-success bg-opacity-20 text-success',
    warning: 'bg-warning bg-opacity-20 text-warning',
  };

  return (
    <span className={clsx('px-3 py-1 rounded-full text-sm font-semibold', variantStyles[variant], className)}>
      {children}
    </span>
  );
};

interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'danger';
  children: React.ReactNode;
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({ variant = 'info', children, onClose }) => {
  const variantStyles = {
    info: 'bg-blue-100 border-blue-400 text-blue-700',
    success: 'bg-green-100 border-green-400 text-green-700',
    warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
    danger: 'bg-red-100 border-red-400 text-red-700',
  };

  return (
    <div className={clsx('border-l-4 p-4 rounded', variantStyles[variant])}>
      <div className="flex justify-between items-start">
        <div>{children}</div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-current hover:opacity-70"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

interface ModalProps {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, title, children, onClose, footer }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="p-6 max-h-96 overflow-y-auto">{children}</div>

        {footer && <div className="p-6 border-t bg-gray-50">{footer}</div>}
      </div>
    </div>
  );
};

interface LoadingProps {
  message?: string;
}

export const Loading: React.FC<LoadingProps> = ({ message = 'Carregando...' }) => (
  <div className="flex flex-col items-center justify-center py-12">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    <p className="mt-4 text-gray-600">{message}</p>
  </div>
);
