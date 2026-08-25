declare module 'node:fs' {
  interface Dirent {
    name: string;
    isDirectory(): boolean;
  }
  interface ReadDirOptions { withFileTypes: true }
  interface FsModule {
    readFileSync(path: string, encoding: 'utf8'): string;
    readdirSync(path: string, options: ReadDirOptions): Dirent[];
  }
  const fs: FsModule;
  export default fs;
}

declare module 'node:path' {
  interface PathModule {
    join(...paths: string[]): string;
  }
  const path: PathModule;
  export default path;
}

declare const process: {
  cwd(): string;
  exit(code?: number): never;
};
