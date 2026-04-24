import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./playprove.module.css";

type PlayprovePrimaryButtonProps = {
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function PlayprovePrimaryButton({ children, className, type = "button", ...rest }: PlayprovePrimaryButtonProps) {
  return (
    <button type={type} className={[styles.ppPrimaryBtn, className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </button>
  );
}
