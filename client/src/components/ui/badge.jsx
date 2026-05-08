import { cn } from '../../lib/utils';

export function Badge({ className = '', variant = 'default', ...props }) {
  const styles = {
    default:
      'border-cyan-300/25 bg-cyan-400/10 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.08)]',
    success:
      'border-emerald-300/25 bg-emerald-400/10 text-emerald-100 shadow-[0_0_12px_rgba(52,211,153,0.08)]',
    warning:
      'border-amber-300/25 bg-amber-400/10 text-amber-100 shadow-[0_0_12px_rgba(251,191,36,0.08)]',
    muted:
      'border-white/10 bg-white/[0.04] text-slate-300',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold',
        'backdrop-blur-sm transition-all duration-300',
        'hover:scale-105 hover:brightness-110',
        styles[variant],
        className
      )}
      {...props}
    />
  );
}
