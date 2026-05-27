'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, ChevronRight } from 'lucide-react';

const SEV_STYLE: Record<string, { bg: string; border: string; fg: string }> = {
  HIGH:   { bg: 'bg-red-50',     border: 'border-red-200',     fg: 'text-red-800' },
  MEDIUM: { bg: 'bg-amber-50',   border: 'border-amber-200',   fg: 'text-amber-800' },
  LOW:    { bg: 'bg-blue-50',    border: 'border-blue-200',    fg: 'text-blue-800' },
  INFO:   { bg: 'bg-gray-50',    border: 'border-gray-200',    fg: 'text-gray-700' },
};

interface Props {
  surface: 'dashboard' | 'property' | 'owner' | 'tenant' | 'ticket' | 'lease';
  entityId?: string;
  title?: string;
  compact?: boolean;
}

export function AISuggestions({ surface, entityId, title = 'AI suggestions', compact = false }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['ai-suggestions', surface, entityId],
    queryFn: () => api.get('/ai/suggestions', { params: { surface, ...(entityId ? { entityId } : {}) } }),
    staleTime: 30_000,
  });

  if (isLoading) return <Skeleton className={compact ? 'h-24' : 'h-44'} />;

  const items: any[] = (data as any)?.data ?? data ?? [];
  if (items.length === 0) return null;

  return (
    <Card className="border-purple-100 bg-gradient-to-br from-purple-50/50 to-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          {title}
          <span className="text-[10px] font-normal text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-full">AI</span>
        </CardTitle>
      </CardHeader>
      <CardContent className={`space-y-2 ${compact ? 'pt-2' : ''}`}>
        {items.slice(0, compact ? 2 : 5).map((s, i) => {
          const style = SEV_STYLE[s.severity] ?? SEV_STYLE.INFO;
          const inner = (
            <div className={`flex items-start gap-3 p-3 rounded-lg border ${style.bg} ${style.border}`}>
              <span className="text-xl flex-shrink-0">{s.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${style.fg}`}>{s.title}</p>
                <p className="text-xs text-gray-700 mt-1 leading-relaxed">{s.body}</p>
              </div>
              {s.action && <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />}
            </div>
          );
          return s.action ? (
            <Link key={i} href={s.action.url} className="block hover:opacity-90 transition-opacity">{inner}</Link>
          ) : (
            <div key={i}>{inner}</div>
          );
        })}
      </CardContent>
    </Card>
  );
}
