import Image from "next/image";
import type { ReactNode } from "react";
import styles from "./playprove.module.css";

export type PlayproveRoleSelectCardProps = {
  imageSrc: string;
  imageAlt: string;
  title: string;
  description: string;
  ctaLabel: string;
  onCtaClick?: () => void;
  footer?: ReactNode;
};

export function PlayproveRoleSelectCard({
  imageSrc,
  imageAlt,
  title,
  description,
  ctaLabel,
  onCtaClick,
  footer,
}: PlayproveRoleSelectCardProps) {
  return (
    <article className={styles.ppRoleCard}>
      <div className={styles.ppRoleMedia}>
        <Image src={imageSrc} alt={imageAlt} fill sizes="(max-width: 900px) 90vw, 280px" />
      </div>
      <div className={styles.ppRoleBody}>
        <h3 className={styles.ppRoleTitle}>{title}</h3>
        <p className={styles.ppRoleDesc}>{description}</p>
        <button type="button" className={styles.ppRoleCta} onClick={onCtaClick}>
          {ctaLabel}
        </button>
        {footer}
      </div>
    </article>
  );
}
