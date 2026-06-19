"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface FunnelDatum {
  stage: string;
  count: number;
}

const SHORT_LABELS: Record<string, string> = {
  "Not Contacted": "Not Contacted",
  "Emailed": "Emailed",
  "Followed Up": "Followed Up",
  "Replied": "Replied",
  "Coffee Chat Scheduled": "Chat Scheduled",
  "Coffee Chat Done": "Chat Done",
  "Closed (Positive)": "Closed ✓",
  "Closed (No Response)": "No Response",
};

export function FunnelChart({ data }: { data: FunnelDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data.map((d) => ({ ...d, label: SHORT_LABELS[d.stage] ?? d.stage }))}
        layout="vertical"
        margin={{ top: 0, right: 16, bottom: 0, left: 4 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          horizontal={false}
          stroke="hsl(var(--border))"
        />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={110}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted))" }}
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)",
            color: "hsl(var(--popover-foreground))",
            fontSize: 12,
          }}
        />
        <Bar
          dataKey="count"
          fill="#3b82f6"
          radius={[0, 4, 4, 0]}
          maxBarSize={22}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
