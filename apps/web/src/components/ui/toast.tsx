'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type ToastVariant = 'default' | 'success' | 'error' | 'warning';

interface ToastProps {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

const VARIANT_STYLES: Record<ToastVariant, string> = {
  default: 'bg-white border-gray-200',
  success: 'bg-amber-50 border-amber-200',
  error: 'bg-red-50 border-red-200',
  warning: 'bg-amber-50 border-amber-200',
};

const VARIANT_ICONS: Record<ToastVariant, string> = {
  default: '💬',
  success: '✅',
  error: '❌',
  warning: '⚠️',
};

function Toast({ title, description, variant = 'default' }: Omit<ToastProps, 'id'>) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 w-80 rounded-xl border p-4 shadow-lg',
        VARIANT_STYLES[variant],
      )}
    >
      <span className="text-lg">{VARIANT_ICONS[variant]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

// Simple toast context
type ToastContextType = {
  toast: (props: Omit<ToastProps, 'id'>) => void;
};

const ToastContext = React.createContext<ToastContextType>({ toast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastProps[]>([]);

  const toast = React.useCallback((props: Omit<ToastProps, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...props, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
        {toasts.map((t) => (
          <Toast key={t.id} title={t.title} description={t.description} variant={t.variant} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return React.useContext(ToastContext);
}

export { Toast };
