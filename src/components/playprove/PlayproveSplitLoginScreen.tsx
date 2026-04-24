"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { PlayproveLogo } from "./PlayproveLogo";
import { PlayprovePrimaryButton } from "./PlayprovePrimaryButton";
import { PLAYPROVE_DESKTOP_LOGIN_HERO } from "./pathSlides";
import styles from "./playprove.module.css";
import { PlayproveTheme } from "./PlayproveTheme";

export type PlayproveSplitLoginScreenProps = {
  heroImageSrc?: string;
  onLogIn?: (payload: { email: string; password: string }) => void;
  onCreateAccount?: () => void;
  supportHref?: string;
  versionLabel?: string;
};

export function PlayproveSplitLoginScreen({
  heroImageSrc = PLAYPROVE_DESKTOP_LOGIN_HERO,
  onLogIn,
  onCreateAccount,
  supportHref = "#",
  versionLabel = "v2.0",
}: PlayproveSplitLoginScreenProps) {
  const emailId = useId();
  const passwordId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <PlayproveTheme>
      <div className={styles.ppLoginPage}>
        <div className={styles.ppLoginTopLinks}>
          <a href={supportHref}>Support</a>
          <span>{versionLabel}</span>
        </div>

        <div className={styles.ppLoginCard}>
          <div className={styles.ppLoginHero}>
            <Image src={heroImageSrc} alt="" fill priority sizes="(max-width: 860px) 100vw, 55vw" />
          </div>

          <div className={styles.ppLoginFormCol}>
            <PlayproveLogo size="sm" />
            <div>
              <h1 className={styles.ppLoginH1}>Operations platform</h1>
              <p className={styles.ppLoginSub}>Please sign in to your team account.</p>
            </div>

            <div className={styles.ppField}>
              <span className={styles.ppFieldIcon}>
                <i className="far fa-envelope" aria-hidden />
              </span>
              <input
                id={emailId}
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className={styles.ppField}>
              <span className={styles.ppFieldIcon}>
                <i className="fas fa-lock" aria-hidden />
              </span>
              <input
                id={passwordId}
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className={styles.ppIconBtn}
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((v) => !v)}
              >
                <i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"} aria-hidden />
              </button>
            </div>

            <div className={styles.ppForgotRow}>
              <a href="#">Forgot password?</a>
            </div>

            <PlayprovePrimaryButton type="button" onClick={() => onLogIn?.({ email, password })}>
              Log in
            </PlayprovePrimaryButton>

            <div className={styles.ppLoginSecondaryBlock}>
              <p className={styles.ppLoginHint}>Don&apos;t have an account?</p>
              <button type="button" className={styles.ppOutlineBtn} onClick={() => onCreateAccount?.()}>
                Create account / Request access
              </button>
            </div>
          </div>
        </div>
      </div>
    </PlayproveTheme>
  );
}
