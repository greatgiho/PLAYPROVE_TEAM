"use client";

import styles from "./playprove.module.css";

export type PlayproveGender = "male" | "female";

type PlayproveGenderToggleProps = {
  value: PlayproveGender;
  onChange: (value: PlayproveGender) => void;
};

export function PlayproveGenderToggle({ value, onChange }: PlayproveGenderToggleProps) {
  return (
    <div className={styles.ppGenderWrap}>
      <div className={styles.ppGender}>
        <button
          type="button"
          className={[styles.ppGenderHalf, value === "male" ? styles.ppGenderHalfActive : ""]
            .filter(Boolean)
            .join(" ")}
          onClick={() => onChange("male")}
        >
          <span aria-hidden>♂</span> Male
        </button>
        <button
          type="button"
          className={[styles.ppGenderHalf, value === "female" ? styles.ppGenderHalfActive : ""]
            .filter(Boolean)
            .join(" ")}
          onClick={() => onChange("female")}
        >
          <span aria-hidden>♀</span> Female
        </button>
      </div>
    </div>
  );
}
