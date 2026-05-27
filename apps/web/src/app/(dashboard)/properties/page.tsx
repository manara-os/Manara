'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Search, Building2, MapPin, Home, TrendingUp } from 'lucide-react';
import { propertiesApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

export default function PropertiesPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['properties', search],
    queryFn: () => propertiesApi.list({ search }),
    staleTime: 60 * 1000,
  });

  const properties = (data as any)?.data ?? (data as any) ?? [];

  return (
    <div className="p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Properties</h1>
          <p className="text-sm text-gray-500 mt-0.5">{properties.length} properties managed</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/properties/new">
              <Plus className="w-4 h-4 mr-2" /> Quick add
            </Link>
          </Button>
          <Button asChild className="bg-amber-600 hover:bg-amber-700">
            <Link href="/onboarding/new-property">
              ✨ Onboard property
            </Link>
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search properties..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 max-w-xs"
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((property: any, i: number) => (
            <motion.div
              key={property.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={`/properties/${property.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer group overflow-hidden p-0">
                  {/* Hero image */}
                  {Array.isArray(property.photos) && property.photos.length > 0 ? (
                    <div className="h-32 w-full relative overflow-hidden">
                      <img
                        src={property.photos[0]}
                        alt={property.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 right-2">
                        <Badge variant={property.status === 'ACTIVE' ? 'success' : 'secondary'} className="text-xs shadow-sm">
                          {property.status ?? 'ACTIVE'}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="h-32 w-full bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center">
                      <Building2 className="w-10 h-10 text-amber-500" />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white text-sm group-hover:text-amber-600 transition-colors truncate">{property.name}</h3>
                          <p className="text-xs text-gray-500">{property.type?.replace(/_/g, ' ')}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{property.area}, {property.city}</span>
                    </div>

                    {/* Occupancy progress bar */}
                    {(() => {
                      const total = property.totalUnits ?? 0;
                      const occupied = property._count?.activeLeases ?? 0;
                      const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;
                      return (
                        <div className="mb-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-500">Occupancy</span>
                            <span className={`font-semibold ${pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{pct}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">{property.totalUnits ?? 0}</div>
                        <div className="text-xs text-gray-500">Units</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                        <div className="text-sm font-semibold text-green-600">{property._count?.activeLeases ?? 0}</div>
                        <div className="text-xs text-gray-500">Occupied</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                        <div className="text-sm font-semibold text-amber-600">{(property.totalUnits ?? 0) - (property._count?.activeLeases ?? 0)}</div>
                        <div className="text-xs text-gray-500">Vacant</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {!isLoading && properties.length === 0 && (
        <div className="text-center py-16">
          <Home className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No properties yet</h3>
          <p className="text-gray-500 text-sm mb-4">Add your first property to get started</p>
          <Button asChild>
            <Link href="/properties/new"><Plus className="w-4 h-4 mr-2" />Add Property</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
