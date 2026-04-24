import Image from "next/image";
import styles from "./playprove.module.css";

export type PlayprovePathCardProps = {
  imageSrc: string;
  imageAlt: string;
  title: string;
  description: string;
};

export function PlayprovePathCard({ imageSrc, imageAlt, title, description }: PlayprovePathCardProps) {
  return (
    <article className={styles.ppCard}>
      <div className={styles.ppCardMedia}>
        <Image src={imageSrc} alt={imageAlt} fill sizes="(max-width: 480px) 86vw, 400px" priority={false} />
      </div>
      <div className={styles.ppCardBody}>
        <h2 className={styles.ppCardTitle}>{title}</h2>
        <p className={styles.ppCardDesc}>{description}</p>
      </div>
    </article>
  );
}
