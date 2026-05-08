import { cn } from '../../lib/utils';

export function Card({ className = '', hover3d = false, ...props }) {
  return (
    <div
      className={cn(
        'card-3d rounded-xl border border-white/[0.08] bg-slate-950/60 text-slate-100 backdrop-blur-2xl',
        'shadow-[0_20px_60px_rgba(2,6,23,0.4),inset_0_1px_0_rgba(255,255,255,0.04)]',
        'transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]',
        'hover:border-cyan-300/20 hover:shadow-[0_28px_80px_rgba(2,6,23,0.5),0_0_40px_rgba(34,211,238,0.06),inset_0_1px_0_rgba(255,255,255,0.06)]',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className = '', ...props }) {
  return <div className={cn('space-y-1.5 p-5', className)} {...props} />;
}

export function CardTitle({ className = '', ...props }) {
  return <h3 className={cn('text-lg font-semibold leading-none tracking-normal text-white', className)} {...props} />;
}

export function CardDescription({ className = '', ...props }) {
  return <p className={cn('text-sm leading-6 text-slate-400', className)} {...props} />;
}

export function CardContent({ className = '', ...props }) {
  return <div className={cn('p-5 pt-0', className)} {...props} />;
}
