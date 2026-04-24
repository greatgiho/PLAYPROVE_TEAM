"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import styles from "./playprove.module.css";

type PlayprovePathCarouselProps = {
  slideCount: number;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  renderSlide: (index: number) => ReactNode;
};

export function PlayprovePathCarousel({
  slideCount,
  activeIndex,
  onActiveIndexChange,
  renderSlide,
}: PlayprovePathCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [ready, setReady] = useState(false);
  const skipScrollFromScrollRef = useRef(false);
  const didInitScrollRef = useRef(false);
  const initialIndexRef = useRef(activeIndex);

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const scroller = scrollerRef.current;
      const cell = cellRefs.current[index];
      if (!scroller || !cell) return;
      const target = cell.offsetLeft - (scroller.clientWidth - cell.clientWidth) / 2;
      scroller.scrollTo({ left: Math.max(0, target), behavior });
    },
    [],
  );

  useLayoutEffect(() => {
    cellRefs.current = cellRefs.current.slice(0, slideCount);
  }, [slideCount]);

  useLayoutEffect(() => {
    scrollToIndex(initialIndexRef.current, "auto");
    setReady(true);
  }, [scrollToIndex]);

  useEffect(() => {
    if (!ready) return;
    if (!didInitScrollRef.current) {
      didInitScrollRef.current = true;
      return;
    }
    if (skipScrollFromScrollRef.current) {
      skipScrollFromScrollRef.current = false;
      return;
    }
    scrollToIndex(activeIndex, "smooth");
  }, [activeIndex, ready, scrollToIndex]);

  const onScroll = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const center = scroller.scrollLeft + scroller.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < slideCount; i++) {
      const el = cellRefs.current[i];
      if (!el) continue;
      const mid = el.offsetLeft + el.clientWidth / 2;
      const d = Math.abs(mid - center);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    if (best === activeIndex) return;
    skipScrollFromScrollRef.current = true;
    onActiveIndexChange(best);
  }, [activeIndex, onActiveIndexChange, slideCount]);

  return (
    <div className={styles.ppCarouselMask}>
      <div ref={scrollerRef} className={styles.ppCarouselScroller} onScroll={onScroll}>
        <div className={styles.ppCarouselRow}>
          {Array.from({ length: slideCount }, (_, i) => (
            <div
              key={i}
              ref={(el) => {
                cellRefs.current[i] = el;
              }}
              className={styles.ppCarouselCell}
            >
              {renderSlide(i)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
