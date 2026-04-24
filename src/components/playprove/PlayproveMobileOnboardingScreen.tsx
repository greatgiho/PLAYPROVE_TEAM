"use client";

import { useState } from "react";
import type { PlayprovePathSlide } from "./pathSlides";
import { PlayproveLogo } from "./PlayproveLogo";
import { PlayprovePaginationDots } from "./PlayprovePaginationDots";
import { PlayprovePathCard } from "./PlayprovePathCard";
import { PlayprovePathCarousel } from "./PlayprovePathCarousel";
import { PlayprovePrimaryButton } from "./PlayprovePrimaryButton";
import { PlayproveSupportLink } from "./PlayproveSupportLink";
import styles from "./playprove.module.css";
import { PlayproveTheme } from "./PlayproveTheme";

export type PlayproveMobileOnboardingScreenProps = {
  slides: PlayprovePathSlide[];
  pageTitle?: string;
  pageTitleVariant?: "dark" | "maroon";
  continueLabel?: string;
  onContinue?: (slide: PlayprovePathSlide, index: number) => void;
  supportHref?: string;
};

export function PlayproveMobileOnboardingScreen({
  slides,
  pageTitle,
  pageTitleVariant = "dark",
  continueLabel = "Continue",
  onContinue,
  supportHref,
}: PlayproveMobileOnboardingScreenProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const slide = slides[activeIndex];

  const titleClass = [styles.ppPageTitle, pageTitleVariant === "maroon" ? styles.ppPageTitleMaroon : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <PlayproveTheme>
      <div className={styles.ppScreen}>
        <div className={styles.ppScreenInner}>
          <PlayproveLogo />
          {pageTitle ? <h1 className={titleClass}>{pageTitle}</h1> : null}

          <PlayprovePathCarousel
            slideCount={slides.length}
            activeIndex={activeIndex}
            onActiveIndexChange={setActiveIndex}
            renderSlide={(i) => {
              const s = slides[i];
              return (
                <PlayprovePathCard
                  imageSrc={s.imageSrc}
                  imageAlt={s.imageAlt}
                  title={s.title}
                  description={s.description}
                />
              );
            }}
          />

          <PlayprovePaginationDots count={slides.length} activeIndex={activeIndex} onSelect={setActiveIndex} />

          <div className={styles.ppActions}>
            <PlayprovePrimaryButton
              type="button"
              onClick={() => {
                if (slide) onContinue?.(slide, activeIndex);
              }}
            >
              {continueLabel}
            </PlayprovePrimaryButton>
            <PlayproveSupportLink supportHref={supportHref} />
          </div>
        </div>
      </div>
    </PlayproveTheme>
  );
}
