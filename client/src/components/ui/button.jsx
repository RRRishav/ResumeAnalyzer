import { cn } from '../../lib/utils';

const variants = {
  default: 'bg-cyan-300 text-slate-950 shadow-[0_12px_28px_rgba(34,211,238,0.28)] hover:bg-cyan-200',
  secondary: 'bg-slate-900/70 text-cyan-50 border border-cyan-300/20 hover:border-cyan-200/50 hover:bg-slate-800',
  outline: 'bg-white/5 text-cyan-50 border border-white/15 hover:bg-white/10 hover:border-cyan-200/40',
  ghost: 'bg-transparent text-slate-300 hover:bg-white/8 hover:text-white',
  destructive: 'bg-rose-500 text-white hover:bg-rose-400',
};

const sizes = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
  icon: 'h-10 w-10 p-0',
};

export function Button({
  className = '',
  variant = 'default',
  size = 'md',
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
