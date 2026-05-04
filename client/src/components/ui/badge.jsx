import { cn } from '../../lib/utils';

export function Badge({ className = '', variant = 'default', ...props }) {
  const styles = {
    default: 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100',
    success: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100',
    warning: 'border-amber-300/25 bg-amber-300/10 text-amber-100',
    muted: 'border-white/10 bg-white/5 text-slate-300',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium',
        styles[variant],
        className
      )}
      {...props}
    />
  );
}
