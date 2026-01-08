import { spawn } from 'child_process';
import type { IPtyAdapter, IPtyAdapterProcess, IPtySpawnOptions } from './types.js';
import { logDebug, logError } from './config.js';
import { PtyError } from './errors.js';

export class PtyAdapterProcess implements IPtyAdapterProcess {
  public readonly pid: number;
  private process: ReturnType<typeof spawn>;
  private dataListeners: ((data: string) => void)[] = [];
  private exitListeners: ((code: number, signal: number) => void)[] = [];

  constructor(proc: ReturnType<typeof spawn>) {
    this.process = proc;
    this.pid = proc.pid;

    proc.stdout?.on('data', (data: Buffer) => {
      this.dataListeners.forEach(listener => listener(data.toString()));
    });

    proc.stderr?.on('data', (data: Buffer) => {
      this.dataListeners.forEach(listener => listener(data.toString()));
    });

    proc.on('exit', (code: number | null, signal: number | null) => {
      const exitCode = code ?? -1;
      const exitSignal = signal ?? 0;
      this.exitListeners.forEach(listener => listener(exitCode, exitSignal));
    });

    proc.on('error', (err) => {
      logError('PTY adapter process error:', err);
    });
  }

  on(event: 'data' | 'exit', listener: any): void {
    if (event === 'data') {
      this.dataListeners.push(listener);
    } else if (event === 'exit') {
      this.exitListeners.push(listener);
    }
  }

  write(data: string): void {
    this.process.stdin?.write(data);
  }

  resize(_cols: number, _rows: number): void {
    logDebug('Resize not supported in fallback adapter');
  }

  kill(): void {
    this.process.kill();
  }
}

export const createFallbackAdapter = (): IPtyAdapter => {
  return {
    spawn: (file: string, args: string[], options: IPtySpawnOptions = {}): IPtyAdapterProcess => {
      logDebug('Using fallback PTY adapter with child_process');
      
      const proc = spawn(file, args, {
        cwd: options.cwd,
        env: options.env ? { ...process.env, ...options.env } : undefined,
      });

      return new PtyAdapterProcess(proc);
    }
  };
};
