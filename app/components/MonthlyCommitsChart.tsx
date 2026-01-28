'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { MonthlyCommitStats } from '@/domain/models';

interface MonthlyCommitsChartProps {
  monthlyCommits: MonthlyCommitStats[];
}

export function MonthlyCommitsChart({ monthlyCommits }: MonthlyCommitsChartProps) {
  // Transform data for Recharts format
  const chartData = monthlyCommits.map((stat) => {
    // Format month label (e.g., "2026-01" -> "Jan '26")
    const [year, month] = stat.month.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = parseInt(month || '1', 10) - 1;
    const monthLabel = `${monthNames[monthIndex]} '${year?.slice(-2)}`;

    return {
      month: monthLabel,
      commits: stat.commitCount,
    };
  });

  // Calculate total commits
  const totalCommits = chartData.reduce((sum, d) => sum + d.commits, 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Commits - Last 12 Months
      </h3>
      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              className="stroke-gray-300 dark:stroke-gray-600" 
            />
            <XAxis
              dataKey="month"
              tick={{ fill: 'currentColor' }}
              className="text-gray-600 dark:text-gray-400"
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tick={{ fill: 'currentColor' }}
              className="text-gray-600 dark:text-gray-400"
              label={{ 
                value: 'Number of Commits', 
                angle: -90, 
                position: 'insideLeft',
                className: 'text-gray-600 dark:text-gray-400'
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                padding: '0.75rem',
              }}
              labelStyle={{ 
                fontWeight: 'bold', 
                marginBottom: '0.5rem',
                color: '#111827'
              }}
              itemStyle={{ color: '#374151' }}
              cursor={{ fill: 'rgba(156, 163, 175, 0.1)' }}
            />
            <Legend
              wrapperStyle={{
                paddingTop: '20px',
              }}
              iconType="square"
            />
            <Bar 
              dataKey="commits" 
              fill="#3b82f6" 
              name="Commits"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
        Total commits across all months: {totalCommits.toLocaleString()}
      </div>
    </div>
  );
}
