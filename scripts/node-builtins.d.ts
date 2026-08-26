/**
 * scripts/ 검증 스크립트가 쓰는 node 내장 모듈의 **최소 선언**.
 *
 * `@types/node`를 넣지 않는 이유: 이 저장소에서 의존성 추가는 승인 대상이고, 앱 코드는
 * node 내장 모듈을 쓰지 않는다(쓰면 안 된다). 검증 스크립트가 저장소의 파일을 정적으로
 * 읽기 위해 필요한 만큼만 여기서 선언한다.
 *
 * 두 갈래의 import 방식을 모두 지원한다 — 한쪽만 두면 다른 쪽 스크립트가 통합될 때
 * 조용히 깨진다:
 *   import fs from 'node:fs'            (character runtime routing guard)
 *   import { readFileSync } from 'node:fs'  (danbaek block flow guard)
 *
 * 여기에 선언을 늘리기 전에 정말 필요한지 본다 — 늘어난다는 건 검증이 앱 코드가 아니라
 * 환경에 기대기 시작했다는 뜻이다.
 */
declare module 'node:fs' {
  interface Dirent {
    name: string;
    isDirectory(): boolean;
  }
  interface ReadDirOptions {
    withFileTypes: true;
  }
  interface FsModule {
    readFileSync(path: string, encoding: 'utf8'): string;
    readdirSync(path: string, options: ReadDirOptions): Dirent[];
  }

  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function readdirSync(path: string, options: ReadDirOptions): Dirent[];

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
