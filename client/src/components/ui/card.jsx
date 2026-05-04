import { cn } from '../../lib/utils';

export function Card({ className = '', ...props }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-white/10 bg-slate-950/62 text-slate-100 shadow-[0_18px_60px_rgba(2,6,23,0.35)] backdrop-blur-xl',
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
