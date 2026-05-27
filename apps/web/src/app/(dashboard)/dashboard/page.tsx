'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Building2,
  Users,
  TrendingUp,
  AlertCircle,
  Wrench,
  BanknoteIcon,
  PhoneCall,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  CalendarClock,
  FileWarning,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RevenueChart } from '@/components/charts/revenue-chart';
import { OccupancyChart } from '@/components/charts/occupancy-chart';
import { OverdueTable } from '@/components/tables/overdue-table';
import { AISuggestions } from '@/components/ai/ai-suggestions';
import { RecentTickets } from '@/components/tables/recent-tickets';
import { useAuthStore } from '@/store/auth.store';
import { financeApi, propertiesApi, ticketsApi, leasesApi, tenantsApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

export default function DashboardPage() {
  const { currentWorkspace, user } = useAuthStore();
  const router = useRouter();
  const currencyCode = currentWorkspace?.workspace.currencyCode || 'AED';

  // Fetch dashboard data in parallel
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['finance', 'summary'],
    queryFn: () => financeApi.getSummary(),
    staleTime: 2 * 60 * 1000,
  });

  const { data: overdueData, isLoading: overdueLoading } = useQuery({
    queryKey: ['finance', 'overdue'],
    queryFn: () => financeApi.getOverdue(),
    staleTime: 2 * 60 * 1000,
  });

  const { data: vacancyData, isLoading: vacancyLoading } = useQuery({
    queryKey: ['properties', 'vacancy'],
    queryFn: () => propertiesApi.getVacancy(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: ticketsData, isLoading: ticketsLoading } = useQuery({
    queryKey: ['tickets', { status: 'OPEN,ASSIGNED,IN_PROGRESS', limit: 10 }],
    queryFn: () => ticketsApi.list({ status: 'OPEN,ASSIGNED,IN_PROGRESS', limit: 10 }),
    staleTime: 2 * 60 * 1000,
  });

  const { data: expiringData } = useQuery({
    queryKey: ['leases-expiring-90'],
    queryFn: () => leasesApi.getExpiring(90),
    staleTime: 5 * 60 * 1000,
  });

  const revenueThisMonth = Number((summaryData as any)?.revenueMtd || 0);
  const expiringLeases: any[] = Array.isArray(expiringData) ? expiringData : ((expiringData as any)?.data ?? []);
  const totalOverdue = Array.isArray(overdueData) ? overdueData.length : ((overdueData as any)?.total || 0);
  const openTickets = Array.isArray(ticketsData) ? (ticketsData as any[]).length : ((ticketsData as any)?.meta?.total || 0);
  const vacantUnits = (vacancyData as any)?.totalVacant || 0;

  const kpiCards = [
    {
      title: 'Revenue MTD',
      value: formatCurrency(revenueThisMonth, currencyCode),
      change: '+12%',
      isPositive: true,
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-950/20',
    },
    {
      title: 'Overdue Rent',
      value: `${totalOverdue} tenants`,
      change: 'Requires action',
      isPositive: false,
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-50 dark:bg-red-950/20',
    },
    {
      title: 'Open Tickets',
      value: openTickets.toString(),
      change: openTickets === 0 ? 'All resolved' : 'Requires attention',
      isPositive: openTickets < 10,
      icon: Wrench,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-950/20',
    },
    {
      title: 'Vacant Units',
      value: vacantUnits.toString(),
      change: 'Ready to lease',
      isPositive: vacantUnits === 0,
      icon: Building2,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/20',
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-gray-900">
            Welcome back, {user?.fullName?.split(' ')[0] || 'PM'}
          </h1>
          <p className="text-muted-foreground text-xs mt-0.5">
            {currentWorkspace?.workspace.name} · {new Date().toLocaleDateString('en-AE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => router.push('/tickets/new')}>
            <PhoneCall className="h-3.5 w-3.5 mr-1.5" />
            New Ticket
          </Button>
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-xs h-8" onClick={() => router.push('/properties/new')}>
            <Building2 className="h-3.5 w-3.5 mr-1.5" />
            Add Property
          </Button>
        </div>
      </div>

      {/* AI Suggestions — top of dashboard */}
      <AISuggestions surface="dashboard" title="What needs your attention today" />


      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map((card, i) => (
          <Card key={card.title} className="hover:shadow-sm transition-shadow border-0 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-1.5 rounded-md ${card.bg}`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
                {card.isPositive ? (
                  <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-1">{card.title}</p>
              {summaryLoading || overdueLoading || vacancyLoading || ticketsLoading ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                <p className="text-xl font-bold text-gray-900">{card.value}</p>
              )}
              <p className={`text-[11px] mt-0.5 ${card.isPositive ? 'text-green-600' : 'text-amber-600'}`}>
                {card.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold">Revenue Overview</CardTitle>
              <CardDescription className="text-xs">Monthly rent collection — last 12 months</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <RevenueChart />
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Occupancy Status</CardTitle>
            <CardDescription className="text-xs">Current portfolio breakdown</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <OccupancyChart />
          </CardContent>
        </Card>
      </div>

      {/* Lease Expiry Alert Strip */}
      {expiringLeases.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <FileWarning className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <span className="text-sm text-amber-800 font-medium">
            {expiringLeases.length} lease{expiringLeases.length > 1 ? 's' : ''} expiring within 90 days
          </span>
          <div className="flex gap-2 ml-1 flex-wrap">
            {expiringLeases.slice(0, 3).map((l: any) => {
              const days = Math.ceil((new Date(l.endDate).getTime() - Date.now()) / 86400000);
              return (
                <span key={l.id} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  {l.tenant?.fullName?.split(' ')[0]} · {days}d
                </span>
              );
            })}
          </div>
          <Link href="/leases" className="ml-auto text-xs text-amber-700 hover:text-amber-800 font-medium flex-shrink-0">
            View Leases →
          </Link>
        </div>
      )}

      {/* Overdue & Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-red-500" />
                Overdue Rent
              </CardTitle>
              <CardDescription className="text-xs">Tenants requiring follow-up</CardDescription>
            </div>
            <Badge variant="destructive" className="text-[10px] h-5">{totalOverdue} overdue</Badge>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <OverdueTable />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Wrench className="h-4 w-4 text-amber-500" />
                Maintenance Tickets
              </CardTitle>
              <CardDescription className="text-xs">Active maintenance requests</CardDescription>
            </div>
            <Badge variant="secondary" className="text-[10px] h-5">{openTickets} open</Badge>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <RecentTickets />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
