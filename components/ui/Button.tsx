import * as React from 'react';
import clsx from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';


export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  startIcon?: React.ElementType;
  endIcon?: React.ElementType;
  /** leftIcon/rightIcon are aliases for startIcon/endIcon */
  leftIcon?: React.ElementType;
  rightIcon?: React.ElementType;
  /** Backwards compat - legacy prop */
  icon?: React.ElementType;
  isLoading?: boolean;
  /** alias */
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
        startIcon: StartIcon,
        endIcon: EndIcon,
        leftIcon: LeftIcon,
        rightIcon: RightIcon,
        icon: IconCompat,
        isLoading = false,
        loading = undefined,
        fullWidth = false,
      disabled,
      className,
      type = 'button',
      ...rest
    },
    ref
  ) => {
    // loading prop alias support
    const isLoadingFlag = typeof loading === 'boolean' ? loading : isLoading;
    const isDisabled = disabled || isLoadingFlag;
    // resolve icon props with backward compatibility
    const Left = StartIcon || LeftIcon || IconCompat;
    const Right = EndIcon || RightIcon;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={clsx(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className
        )}
        {...rest}
      >
        {isLoadingFlag ? (
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
        ) : (
          Left && <Left className="mr-2 h-4 w-4" />
        )}

        {children}

        {!isLoadingFlag && Right && (
          <Right className="ml-2 h-4 w-4" />
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

/* ====== STYLES CONFIG ====== */

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600',
  secondary:
    'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-400',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600',
  ghost:
    'bg-transparent text-gray-700 hover:bg-gray-100 focus-visible:ring-gray-300',
  outline:
    'bg-white text-gray-900 border border-slate-300 hover:bg-slate-50 focus-visible:ring-gray-400',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export default Button;
