"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface RevenueStats {
  mrr: number;
  arr: number;
  planBreakdown: Record<string, number>;
  totalUsers: number;
  paidUsers: number;
  conversionRate: number;
  arpu: number;
  cancelScheduled: number;
  mrrTimeSeries: Array<{
    month: string;
    mrr: number;
  }>;
}

const PLAN_COLORS: Record<string, string> = {
  free: "#9ca3af",
  standard: "#3b82f6",
  premium: "#8b5cf6",
};

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  standard: "Standard",
  premium: "Premium",
};

export default function AdminRevenuePage() {
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/admin/revenue");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch revenue stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const planData = stats?.planBreakdown
    ? Object.entries(stats.planBreakdown).map(([name, value]) => ({
        name: PLAN_LABELS[name] || name,
        value,
        color: PLAN_COLORS[name] || "#9ca3af",
      }))
    : [];

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Revenue & Subscriptions</h1>
        <div className="h-[400px] animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Revenue & Subscriptions</h1>
        <p className="text-muted-foreground mt-1">
          Track revenue metrics and subscription health
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              MRR (Monthly Recurring Revenue)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency(stats?.mrr || 0)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ARR (Annual Recurring Revenue)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {formatCurrency(stats?.arr || 0)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ARPU (Avg Revenue Per User)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {formatCurrency(stats?.arpu || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Paid users only</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {stats?.conversionRate || 0}%
            </div>
            <p className="text-xs text-muted-foreground">Free → Paid</p>
          </CardContent>
        </Card>
      </div>

      {/* User Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paid Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.paidUsers || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Cancellations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {stats?.cancelScheduled || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* MRR Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>MRR Trend (12 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats?.mrrTimeSeries || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis
                    className="text-xs"
                    tickFormatter={(value) => `¥${value.toLocaleString()}`}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "MRR"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="mrr"
                    stroke="#22c55e"
                    strokeWidth={3}
                    dot={{ fill: "#22c55e", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Plan Distribution - Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {planData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Plan Distribution - Bar */}
        <Card>
          <CardHeader>
            <CardTitle>Users by Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={planData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" className="text-xs" width={80} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {planData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Buyout Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Key Metrics for Valuation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="p-4 rounded-lg border">
              <p className="text-sm text-muted-foreground">
                Revenue Multiple (ARR × 5)
              </p>
              <p className="text-2xl font-bold mt-1">
                {formatCurrency((stats?.arr || 0) * 5)}
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <p className="text-sm text-muted-foreground">
                Revenue Multiple (ARR × 10)
              </p>
              <p className="text-2xl font-bold mt-1">
                {formatCurrency((stats?.arr || 0) * 10)}
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <p className="text-sm text-muted-foreground">
                User Value (Paid × ¥10,000)
              </p>
              <p className="text-2xl font-bold mt-1">
                {formatCurrency((stats?.paidUsers || 0) * 10000)}
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <p className="text-sm text-muted-foreground">LTV (ARPU × 12)</p>
              <p className="text-2xl font-bold mt-1">
                {formatCurrency((stats?.arpu || 0) * 12)}
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <p className="text-sm text-muted-foreground">
                Monthly Revenue Per Total User
              </p>
              <p className="text-2xl font-bold mt-1">
                {formatCurrency(
                  stats?.totalUsers ? (stats.mrr / stats.totalUsers) : 0
                )}
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <p className="text-sm text-muted-foreground">
                Paid User Percentage
              </p>
              <p className="text-2xl font-bold mt-1">
                {stats?.totalUsers
                  ? ((stats.paidUsers / stats.totalUsers) * 100).toFixed(1)
                  : 0}
                %
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
