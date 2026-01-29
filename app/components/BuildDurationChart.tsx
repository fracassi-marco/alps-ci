'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { DurationTrend } from '@/domain/models';

interface BuildDurationChartProps {
  durationTrends: DurationTrend[];
}

export function BuildDurationChart({ durationTrends }: BuildDurationChartProps) {
  // Transform data for Recharts format
  const chartData = durationTrends.map((trend) => {
    // Format month label (e.g., "2026-01" -> "Jan '26")
    const [year, month] = trend.period.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = parseInt(month || '1', 10) - 1;
    const monthLabel = `${monthNames[monthIndex]} '${year?.slice(-2)}`;

    // Convert milliseconds to minutes for display
    const minMinutes = trend.minDuration / 1000 / 60;
    const avgMinutes = trend.avgDuration / 1000 / 60;
    const maxMinutes = trend.maxDuration / 1000 / 60;

    // Calculate stacked segments: min, avg-min, max-avg
    return {
      month: monthLabel,
      minMinutes: minMinutes,
      avgDiffMinutes: avgMinutes - minMinutes, // Difference between avg and min
      maxDiffMinutes: maxMinutes - avgMinutes, // Difference between max and avg
      count: trend.count,
      // Keep original milliseconds for tooltip
      avgDuration: trend.avgDuration,
      minDuration: trend.minDuration,
      maxDuration: trend.maxDuration,
    };
  });

  // Calculate average duration across all months (only non-zero values)
  const nonZeroData = chartData.filter(d => (d.minMinutes + d.avgDiffMinutes) > 0);
  const overallAvg = nonZeroData.length > 0
    ? nonZeroData.reduce((sum, d) => sum + d.minMinutes + d.avgDiffMinutes, 0) / nonZeroData.length
    : 0;

  // Format duration for display
  const formatDuration = (milliseconds: number) => {
    const totalSeconds = Math.round(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null;

    const data = payload[0].payload;
    
    if (data.count === 0) {
      return (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid #e5e7eb',
          borderRadius: '0.5rem',
          padding: '0.75rem',
        }}>
          <p style={{ fontWeight: 'bold', marginBottom: '0.25rem', color: '#111827' }}>
            {data.month}
          </p>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>No runs this month</p>
        </div>
      );
    }

    return (
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem',
        padding: '0.75rem',
      }}>
        <p style={{ fontWeight: 'bold', marginBottom: '0.5rem', color: '#111827' }}>
          {data.month}
        </p>
        <div style={{ fontSize: '0.875rem' }}>
          <p style={{ color: '#3b82f6', marginBottom: '0.25rem' }}>
            <strong>Avg:</strong> {formatDuration(data.avgDuration)}
          </p>
          <p style={{ color: '#10b981', marginBottom: '0.25rem' }}>
            <strong>Min:</strong> {formatDuration(data.minDuration)}
          </p>
          <p style={{ color: '#f59e0b', marginBottom: '0.25rem' }}>
            <strong>Max:</strong> {formatDuration(data.maxDuration)}
          </p>
          <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>
            {data.count} {data.count === 1 ? 'run' : 'runs'}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Build Duration Trends - Last 12 Months
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
                value: 'Duration (minutes)', 
                angle: -90, 
                position: 'insideLeft',
                className: 'text-gray-600 dark:text-gray-400'
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{
                paddingTop: '20px',
              }}
              iconType="square"
            />
            <Bar 
              dataKey="minMinutes" 
              stackId="duration"
              fill="#10b981" 
              name="Min Duration"
              radius={[0, 0, 0, 0]}
            />
            <Bar 
              dataKey="avgDiffMinutes" 
              stackId="duration"
              fill="#3b82f6" 
              name="Avg Duration (additional)"
              radius={[0, 0, 0, 0]}
            />
            <Bar 
              dataKey="maxDiffMinutes" 
              stackId="duration"
              fill="#f59e0b" 
              name="Max Duration (additional)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {overallAvg > 0 && (
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
          Average build duration: {overallAvg.toFixed(1)} minutes
        </div>
      )}
    </div>
  );
}
