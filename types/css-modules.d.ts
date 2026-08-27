/**
 * CSS / CSS-module 타입 선언.
 *
 * 왜 별도 파일인가: 이 선언은 원래 `expo-env.d.ts`에 손으로 적혀 있었는데, 그 파일은
 * **Expo가 생성/재생성하는 파일**이고 `.gitignore`에도 올라 있다. 실제로 재생성이 한 번
 * 돌면서 손으로 넣은 선언이 지워졌고(그 결과 워크트리가 계속 dirty였다), 반대로 그 파일이
 * 없는 fresh checkout에서는 `src/global.css` / `*.module.css` import가 TS2307/TS2882로
 * 깨졌다.
 *
 * 그래서 생성 파일에 기대지 않고 여기(추적 대상)에 둔다. Expo가 expo-env.d.ts를 몇 번
 * 재생성하든 이 선언은 사라지지 않고, CI/fresh checkout에서도 동일하게 동작한다.
 */

declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}

declare module '*.css' {
  const classes: Record<string, string>;
  export default classes;
}
