"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const WEEK_DATA = [
  { day: "Sat", planned: 8, done: 6 },
  { day: "Sun", planned: 6, done: 4 },
  { day: "Mon", planned: 7, done: 7 },
  { day: "Tue", planned: 8, done: 5 },
  { day: "Wed", planned: 6, done: 6 },
  { day: "Thu", planned: 7, done: 5 },
  { day: "Fri", planned: 5, done: 4 }
];

export function ProductivityOverview() {
  return (
    <section className="card">
      <h2>Weekly Tasks: Planned vs Done</h2>
      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <LineChart data={WEEK_DATA} margin={{ top: 16, right: 20, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="planned" stroke="#1d3a34" strokeWidth={2} />
            <Line type="monotone" dataKey="done" stroke="#e0b55f" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
