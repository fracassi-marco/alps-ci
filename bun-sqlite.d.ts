/**
 * Type declarations for Bun's native SQLite module
 * This module is only available when running with Bun's native runtime (bun --bun)
 */

declare module "bun:sqlite" {
  export class Database {
    constructor(filename: string, options?: { readonly?: boolean; create?: boolean });

    prepare(sql: string): Statement;
    exec(sql: string): void;
    close(): void;

    readonly inTransaction: boolean;

    transaction<T extends (...args: any[]) => any>(
      fn: T
    ): (...args: Parameters<T>) => ReturnType<T>;
  }

  export interface Statement {
    run(...params: any[]): RunResult;
    get(...params: any[]): any;
    all(...params: any[]): any[];
    values(...params: any[]): any[][];
    finalize(): void;
  }

  export interface RunResult {
    changes: number;
    lastInsertRowid: number;
  }
}

