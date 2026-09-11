'use client';

import { useQuery } from '@tanstack/react-query';
import { Building2, MapPin, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ownersApi } from '@/lib/api';

export default function OwnerPropertiesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['owner', 'my-portfolio'],
    queryFn: () => ownersApi.getMyPortfolio(),
    staleTime: 2 * 60 * 1000,
  });

  const properties: any[] = (data as any)?.owner?.properties ?? [];

  return (
    <div className="flex flex-col gap-3 p-4">
      <h1 className="text-lg font-semibold text-gray-900">My Properties</h1>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && properties.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">No properties assigned to your portfolio yet.</p>
        </div>
      )}

      {!isLoading && properties.map((property) => {
        const units: any[] = property.units ?? [];
        const occupied = units.filter((u) => u.occupancyStatus === 'OCCUPIED').length;
        const vacant = units.length - occupied;

        return (
          <Card key={property.id} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{property.name}</p>
                  {(property.area || property.city) && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{[property.area, property.city].filter(Boolean).join(', ')}</span>
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0 mt-0.5" />
              </div>

              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <Badge variant="secondary" className="text-[11px]">{units.length} unit{units.length === 1 ? '' : 's'}</Badge>
                {occupied > 0 && (
                  <Badge variant="success" className="text-[11px]">{occupied} occupied</Badge>
                )}
                {vacant > 0 && (
                  <Badge variant="warning" className="text-[11px]">{vacant} vacant</Badge>
                )}
              </div>

              {units.some((u) => u.leases?.[0]?.tenant) && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-1.5">
                  {units.filter((u) => u.leases?.[0]?.tenant).slice(0, 3).map((u) => (
                    <div key={u.id} className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Unit {u.unitNumber}</span>
                      <span className="text-gray-700 font-medium">{u.leases[0].tenant.fullName}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
