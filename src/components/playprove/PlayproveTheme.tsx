import type { ReactNode } from "react";
import styles from "./playprove.module.css";

export function PlayproveTheme({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={[styles.ppTheme, className].filter(Boolean).join(" ")}>{children}</div>;
}
