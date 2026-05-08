import { cn } from '../../lib/utils';

const variants = {
  default:
    'bg-gradient-to-r from-cyan-400 to-cyan-300 text-slate-950 font-bold ' +
    'shadow-[0_8px_32px_rgba(34,211,238,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] ' +
    'hover:shadow-[0_12px_40px_rgba(34,211,238,0.5),inset_0_1px_0_rgba(255,255,255,0.3)] ' +
    'hover:scale-[1.03] hover:-translate-y-0.5 ' +
    'active:scale-[0.98] active:shadow-[0_4px_20px_rgba(34,211,238,0.3)]',
  secondary:
    'bg-slate-900/70 text-cyan-50 border border-cyan-300/20 ' +
    'shadow-[0_4px_20px_rgba(0,0,0,0.2)] ' +
    'hover:border-cyan-200/50 hover:bg-slate-800/80 hover:shadow-[0_8px_30px_rgba(34,211,238,0.12)] ' +
    'hover:scale-[1.02] hover:-translate-y-0.5',
  outline:
    'bg-white/[0.03] text-cyan-50 border border-white/15 ' +
    'shadow-[0_2px_16px_rgba(0,0,0,0.15)] ' +
    'hover:bg-white/[0.08] hover:border-cyan-200/40 hover:shadow-[0_8px_28px_rgba(34,211,238,0.1)] ' +
    'hover:scale-[1.02] hover:-translate-y-0.5',
  ghost:
    'bg-transparent text-slate-300 ' +
    'hover:bg-white/[0.06] hover:text-white hover:scale-[1.02]',
  destructive:
    'bg-gradient-to-r from-rose-500 to-pink-500 text-white ' +
    'shadow-[0_8px_24px_rgba(244,63,94,0.3)] ' +
    'hover:shadow-[0_12px_32px_rgba(244,63,94,0.4)] hover:scale-[1.03]',
};

const sizes = {
  sm: 'h-9 px-3.5 text-sm rounded-lg',
  md: 'h-11 px-5 text-sm rounded-lg',
  lg: 'h-[3.25rem] px-7 text-base rounded-xl',
  icon: 'h-10 w-10 p-0 rounded-lg',
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
        'group relative inline-flex items-center justify-center gap-2 font-semibold',
        'transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
