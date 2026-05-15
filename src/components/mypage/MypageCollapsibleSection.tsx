"use client";

import { useId, useState, type ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function MypageCollapsibleSection({ title, subtitle, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className="card mypage-collapse" style={{ marginTop: 20 }}>
      <button
        type="button"
        className="mypage-collapse-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="mypage-collapse-chevron" aria-hidden>
          <i className={`fas fa-chevron-${open ? "down" : "right"}`} />
        </span>
        <span className="mypage-collapse-titles">
          <span className="mypage-collapse-title">{title}</span>
          {subtitle && !open ? <span className="mypage-collapse-subtitle">{subtitle}</span> : null}
        </span>
      </button>
      {open ? (
        <div id={panelId} className="mypage-collapse-panel">
          {children}
        </div>
      ) : null}
    </div>
  );
}
