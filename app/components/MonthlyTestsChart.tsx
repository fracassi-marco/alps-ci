'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { TestTrendDataPoint } from '@/domain/models';

interface TestTrendChartProps {
  testTrend: TestTrendDataPoint[];
}

export function MonthlyTestsChart({ testTrend }: TestTrendChartProps) {
  // Transform data for Recharts format
  const chartData = testTrend.map((dataPoint, index) => {
    const date = new Date(dataPoint.date);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthLabel = monthNames[date.getMonth()];
    const dayLabel = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    // For many data points, show just date; for fewer, include time
    const shortLabel = `${monthLabel} ${dayLabel}`;
    const fullLabel = `${monthLabel} ${dayLabel}, ${hours}:${minutes}`;
    
    return {
      date: testTrend.length > 50 ? shortLabel : fullLabel,
      fullDate: fullLabel, // Keep full date for tooltip
      timestamp: date.getTime(),
      index: index,
      totalTests: dataPoint.totalTests,
      passedTests: dataPoint.passedTests,
      failedTests: dataPoint.failedTests,
      skippedTests: dataPoint.skippedTests,
    };
  });

  // Calculate statistics
  const totalRuns = chartData.length;
  const avgTests = totalRuns > 0
    ? Math.round(chartData.reduce((sum, d) => sum + d.totalTests, 0) / totalRuns)
    : 0;
  const latestTests = chartData.length > 0 ? chartData[chartData.length - 1]!.totalTests : 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Test Count Trend - All Runs
      </h3>
      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              className="stroke-gray-300 dark:stroke-gray-600" 
            />
            <XAxis
              dataKey="date"
              tick={{ fill: 'currentColor', fontSize: 10 }}
              className="text-gray-600 dark:text-gray-400"
              angle={-45}
              textAnchor="end"
              height={80}
              interval="equidistantPreserveStart"
              minTickGap={30}
            />
            <YAxis
              tick={{ fill: 'currentColor' }}
              className="text-gray-600 dark:text-gray-400"
              label={{ 
                value: 'Number of Tests', 
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
              labelFormatter={(value, payload) => {
                // Show full date with time in tooltip
                if (payload && payload[0]) {
                  return payload[0].payload.fullDate;
                }
                return value;
              }}
            />
            <Legend
              wrapperStyle={{
                paddingTop: '20px',
              }}
              iconType="line"
            />
            <Line 
              type="monotone"
              dataKey="totalTests" 
              stroke="#a855f7" 
              strokeWidth={2}
              name="Total Tests"
              dot={{ fill: '#a855f7', r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line 
              type="monotone"
              dataKey="passedTests" 
              stroke="#10b981" 
              strokeWidth={2}
              name="Passed"
              dot={{ fill: '#10b981', r: 2 }}
              activeDot={{ r: 4 }}
            />
            <Line 
              type="monotone"
              dataKey="failedTests" 
              stroke="#ef4444" 
              strokeWidth={2}
              name="Failed"
              dot={{ fill: '#ef4444', r: 2 }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400 text-center">
        <div>
          <span className="font-medium">Total Runs:</span> {totalRuns}
        </div>
        <div>
          <span className="font-medium">Average Tests:</span> {avgTests}
        </div>
        <div>
          <span className="font-medium">Latest:</span> {latestTests} tests
        </div>
      </div>
    </div>
  );
}
