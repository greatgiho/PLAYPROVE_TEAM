import type { ReactNode } from "react";

type StackProps = {
  children: ReactNode;
  className?: string;
  gap?: 2 | 3 | 4 | 6;
};

/** 세로 스택 — Tailwind + app 토큰 기본 간격 */
export function Stack({ children, className = "", gap = 4 }: StackProps) {
  const gapCls = gap === 2 ? "gap-2" : gap === 3 ? "gap-3" : gap === 6 ? "gap-6" : "gap-4";
  return <div className={`flex flex-col ${gapCls} ${className}`.trim()}>{children}</div>;
}
