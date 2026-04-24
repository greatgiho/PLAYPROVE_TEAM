import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
  /** 패딩 생략 시 false */
  padded?: boolean;
};

/** 표면 카드 — app 토큰 기반 (Phase 1 파일럿) */
export function Card({ children, className = "", padded = true }: CardProps) {
  const pad = padded ? "p-4" : "";
  return (
    <div
      className={`rounded-app border border-app-border bg-app-surface shadow-app ${pad} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
