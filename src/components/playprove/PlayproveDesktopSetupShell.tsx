import type { ReactNode } from "react";
import { PlayproveLogo } from "./PlayproveLogo";
import styles from "./playprove.module.css";
import { PlayproveTheme } from "./PlayproveTheme";

type Step = { id: string; label: string };

type PlayproveDesktopSetupShellProps = {
  userName: string;
  steps: [Step, Step];
  activeStepIndex: 0 | 1;
  children: ReactNode;
  footerLeft?: ReactNode;
  footerRight?: ReactNode;
};

export function PlayproveDesktopSetupShell({
  userName,
  steps,
  activeStepIndex,
  children,
  footerLeft,
  footerRight,
}: PlayproveDesktopSetupShellProps) {
  const [a, b] = steps;
  return (
    <PlayproveTheme>
      <div className={styles.ppDeskShell}>
        <header className={styles.ppDeskTop}>
          <PlayproveLogo />
          <p className={styles.ppDeskGreet}>
            Welcome, {userName}. Complete your setup to begin.
          </p>
          <div className={styles.ppDeskUser}>
            <div className={styles.ppDeskAvatar} aria-hidden>
              <i className="fas fa-user" />
            </div>
            <span>{userName}</span>
            <span aria-hidden style={{ color: "var(--pp-subtle)", fontSize: 12 }}>
              ▾
            </span>
          </div>
        </header>

        <div className={styles.ppSteps}>
          <div className={[styles.ppStep, activeStepIndex === 0 ? styles.ppStepActive : ""].filter(Boolean).join(" ")}>
            {a.label}
          </div>
          <span className={styles.ppStepDivider} aria-hidden>
            ›
          </span>
          <div className={[styles.ppStep, activeStepIndex === 1 ? styles.ppStepActive : ""].filter(Boolean).join(" ")}>
            {b.label}
          </div>
        </div>

        <main className={styles.ppDeskMain}>{children}</main>

        <footer className={styles.ppDeskFooter}>
          <div>{footerLeft ?? "© PlayProve 2026"}</div>
          <div>{footerRight}</div>
        </footer>
      </div>
    </PlayproveTheme>
  );
}
