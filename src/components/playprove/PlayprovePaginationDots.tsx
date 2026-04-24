"use client";

import styles from "./playprove.module.css";

type PlayprovePaginationDotsProps = {
  count: number;
  activeIndex: number;
  onSelect?: (index: number) => void;
  className?: string;
};

export function PlayprovePaginationDots({
  count,
  activeIndex,
  onSelect,
  className,
}: PlayprovePaginationDotsProps) {
  return (
    <div className={[styles.ppDots, className].filter(Boolean).join(" ")} role="tablist" aria-label="Slides">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          role="tab"
          aria-selected={i === activeIndex}
          className={[styles.ppDot, i === activeIndex ? styles.ppDotActive : ""].filter(Boolean).join(" ")}
          onClick={() => onSelect?.(i)}
        />
      ))}
    </div>
  );
}
