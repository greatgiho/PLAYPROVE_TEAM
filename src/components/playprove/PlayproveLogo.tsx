import styles from "./playprove.module.css";

type PlayproveLogoProps = {
  size?: "md" | "sm";
};

export function PlayproveLogo({ size = "md" }: PlayproveLogoProps) {
  return (
    <div className={styles.ppLogoRow}>
      <div className={[styles.ppLogoMark, size === "sm" ? styles.ppLogoMarkSm : ""].filter(Boolean).join(" ")}>
        p
      </div>
      <span className={styles.ppWordmark}>playprove</span>
    </div>
  );
}
