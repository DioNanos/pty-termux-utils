export interface IPtyNativeImplementation {
  spawn(file: string, args: string[], options: IPtySpawnOptions): IPty;
}

export interface IPtySpawnOptions {
  name?: string;
  cols?: number;
  rows?: number;
  cwd?: string;
  env?: Record<string, string>;
  handleFlowControl?: boolean;
}

export interface IPty {
  pid: number;
  on(event: 'data', listener: (data: string) => void): void;
  on(event: 'exit', listener: (exitCode: number, signal: number) => void): void;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(): void;
}

export type PtyProviderName =
  | 'mmmbuto-node-pty'
  | 'lydell-node-pty-linux-arm64';

export type PtyImplementation = {
  module: IPtyNativeImplementation;
  name: PtyProviderName;
} | null;

export interface IPtyAdapter {
  spawn(file: string, args: string[], options: IPtySpawnOptions): IPtyAdapterProcess;
}

export interface IPtyAdapterProcess {
  pid: number;
  on(event: 'data', listener: (data: string) => void): void;
  on(event: 'exit', listener: (exitCode: number, signal: number) => void): void;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(): void;
}
