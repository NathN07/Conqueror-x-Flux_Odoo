import { ReactNode, InputHTMLAttributes, FC } from 'react';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  children?: ReactNode; // Allow custom inputs/selects/textareas
}

export const FormField: FC<FormFieldProps> = ({
  label,
  error,
  helperText,
  required,
  children,
  id,
  className = '',
  ...inputProps
}) => {
  const fieldId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5 text-left">
      <label
        htmlFor={fieldId}
        className="block text-sm font-medium text-slate-700"
      >
        {label}
        {required && <span className="text-rose-500 ml-1 font-bold">*</span>}
      </label>

      {children ? (
        children
      ) : (
        <input
          id={fieldId}
          className={`w-full px-3.5 py-2 text-sm bg-white border rounded-lg shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors ${
            error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
              : 'border-slate-300 hover:border-slate-400'
          } ${className}`}
          {...inputProps}
        />
      )}

      {error ? (
        <p className="text-xs text-rose-600 font-medium flex items-center gap-1 mt-1">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      ) : helperText ? (
        <p className="text-xs text-slate-500 mt-1">{helperText}</p>
      ) : null}
    </div>
  );
};
