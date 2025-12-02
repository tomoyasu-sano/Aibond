"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface Feedback {
  id: string;
  user_id: string | null;
  user_email: string | null;
  rating: string | null;
  category: string | null;
  message: string | null;
  page_url: string | null;
  created_at: string;
}

interface FeedbackStats {
  feedbacks: Feedback[];
  totalCount: number;
  ratingBreakdown: Record<string, number>;
}

const RATING_COLORS: Record<string, string> = {
  love: "#22c55e",
  good: "#84cc16",
  neutral: "#f59e0b",
  bad: "#f97316",
  terrible: "#ef4444",
  no_rating: "#9ca3af",
};

const RATING_LABELS: Record<string, string> = {
  love: "Love it!",
  good: "Good",
  neutral: "Okay",
  bad: "Needs work",
  terrible: "Struggling",
  no_rating: "No rating",
};

export default function AdminFeedbacksPage() {
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const url = filter
          ? `/api/admin/feedbacks?rating=${filter}`
          : "/api/admin/feedbacks";
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch feedbacks:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [filter]);

  const ratingData = stats?.ratingBreakdown
    ? Object.entries(stats.ratingBreakdown).map(([name, value]) => ({
        name: RATING_LABELS[name] || name,
        value,
        color: RATING_COLORS[name] || "#9ca3af",
      }))
    : [];

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Feedbacks</h1>
        <div className="h-[400px] animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Feedbacks</h1>
          <p className="text-muted-foreground mt-1">
            User feedback and suggestions
          </p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border bg-background px-4 py-2"
        >
          <option value="">All ratings</option>
          <option value="love">Love it!</option>
          <option value="good">Good</option>
          <option value="neutral">Okay</option>
          <option value="bad">Needs work</option>
          <option value="terrible">Struggling</option>
        </select>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Feedbacks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rating Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ratingData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {ratingData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {ratingData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-1 text-xs">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span>{entry.name}</span>
                  <span className="text-muted-foreground">({entry.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feedback List */}
      <Card>
        <CardHeader>
          <CardTitle>All Feedbacks</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.feedbacks?.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No feedbacks yet
            </p>
          ) : (
            <div className="space-y-4">
              {stats?.feedbacks?.map((feedback) => (
                <div
                  key={feedback.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Rating & Category */}
                      <div className="flex items-center gap-2 mb-2">
                        {feedback.rating && (
                          <span
                            className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium"
                            style={{
                              backgroundColor: `${RATING_COLORS[feedback.rating]}20`,
                              color: RATING_COLORS[feedback.rating],
                            }}
                          >
                            {RATING_LABELS[feedback.rating] || feedback.rating}
                          </span>
                        )}
                        {feedback.category && (
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-xs">
                            {feedback.category}
                          </span>
                        )}
                      </div>

                      {/* Message */}
                      <p className="text-sm whitespace-pre-wrap">
                        {feedback.message || (
                          <span className="text-muted-foreground italic">
                            No message
                          </span>
                        )}
                      </p>

                      {/* Meta */}
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span>
                          {feedback.user_email || "Anonymous"}
                        </span>
                        {feedback.page_url && (
                          <span className="truncate max-w-[200px]">
                            {feedback.page_url}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Date */}
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(feedback.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
