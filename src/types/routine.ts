/**
 * 루틴은 선택 기능이다 — 강제하지 않는다 (제품 기획 9장).
 */
export interface Routine {
  id: string;
  name: string;
  exerciseIds: string[];
  /** 0=일 ~ 6=토 (Date.getDay() 규칙), 선택 사항 */
  scheduledDays?: number[];
  createdAt: string;
  updatedAt: string;
}
