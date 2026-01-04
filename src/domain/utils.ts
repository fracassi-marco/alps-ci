import type { Build, BuildStats } from './models';
import { randomBytes } from 'crypto';

// Generate unique ID for builds
export function generateBuildId(): string {
  return randomBytes(16).toString('hex');
}

// Calculate health percentage from statistics
export function calculateHealthPercentage(
  successfulExecutions: number,
  totalExecutions: number
): number {
  if (totalExecutions === 0) {
    return 0;
  }
  return Math.round((successfulExecutions / totalExecutions) * 100);
}

// Get health status badge color based on percentage
export function getHealthBadgeColor(healthPercentage: number): 'green' | 'yellow' | 'red' {
  if (healthPercentage >= 90) {
    return 'green';
  } else if (healthPercentage >= 70) {
    return 'yellow';
  } else {
    return 'red';
  }
}

// Format date to ISO string for consistency
export function formatDate(date: Date): string {
  return date.toISOString();
}

// Parse date string to Date object
export function parseDate(dateString: string): Date {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`);
  }
  return date;
}

// Create a new Build object with defaults
export function createBuild(
  data: Omit<Build, 'id' | 'createdAt' | 'updatedAt'>
): Build {
  const now = new Date();
  return {
    id: generateBuildId(),
    ...data,
    createdAt: now,
    updatedAt: now,
  };
}

// Update Build timestamps
export function updateBuildTimestamp(build: Build): Build {
  return {
    ...build,
    updatedAt: new Date(),
  };
}

// Check if stats are available
export function hasStats(stats: BuildStats | null): stats is BuildStats {
  return stats !== null;
}

// Get date range for last N days
export function getLastNDaysRange(days: number): Date[] {
  const dates: Date[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    dates.push(date);
  }

  return dates;
}

// Format date to YYYY-MM-DD
export function formatDateYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

