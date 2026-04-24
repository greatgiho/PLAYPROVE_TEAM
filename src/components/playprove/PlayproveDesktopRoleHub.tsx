"use client";

import { useMemo, useState } from "react";
import type { PlayproveGender } from "./PlayproveGenderToggle";
import { PlayproveGenderToggle } from "./PlayproveGenderToggle";
import { PlayproveRoleSelectCard } from "./PlayproveRoleSelectCard";
import { PlayproveDesktopSetupShell } from "./PlayproveDesktopSetupShell";
import { PlayproveSupportLink } from "./PlayproveSupportLink";
import styles from "./playprove.module.css";

const base = "/playprove";

type CardDef = {
  id: string;
  title: string;
  description: string;
  cta: string;
  maleSrc: string;
  femaleSrc: string;
  maleAlt: string;
  femaleAlt: string;
};

const ROLE_CARDS: CardDef[] = [
  {
    id: "personal",
    title: "Personal growth management",
    description:
      "Manage individualized performance for Crossfit, weight training, and HYROX. See detailed dashboards.",
    cta: "Personalize my path",
    maleSrc: `${base}/mobile_roll_personal_male-362e2bd9-4379-4d4c-a71d-13df11d82b3a.png`,
    femaleSrc: `${base}/mobile_roll_personal_female-1f454069-53fc-4f4d-b5e4-ef4f95fe655f.png`,
    maleAlt: "Personal growth — male art",
    femaleAlt: "Personal growth — female art",
  },
  {
    id: "player",
    title: "Player",
    description: "Access drills, game film, manage your athletic potential.",
    cta: "Launch player hub",
    maleSrc: `${base}/mobile_roll_player_male-5befa568-9f41-47ea-8e77-aa7ea1dc5ab3.png`,
    femaleSrc: `${base}/mobile_roll_player_female-d6a9d9eb-94c6-4bde-aafd-309bfad4c507.png`,
    maleAlt: "Player — male art",
    femaleAlt: "Player — female art",
  },
  {
    id: "coach",
    title: "Coach",
    description: "Plan practices, lead team strategies, and manage rosters.",
    cta: "Launch coaching center",
    maleSrc: `${base}/mobile_roll_coach_male-04d845ed-b7c3-435f-acd0-8b0dca295f55.png`,
    femaleSrc: `${base}/mobile_roll_coach_female-c7ae4858-cd16-4853-8cbe-4d60d9a93cd4.png`,
    maleAlt: "Coach — male art",
    femaleAlt: "Coach — female art",
  },
  {
    id: "manager",
    title: "Manager & staff",
    description: "Oversee operations, manage logistics, and coordinate resources.",
    cta: "Go to management portal",
    maleSrc: `${base}/mobile_roll_manager_male-8c6fd2e0-efac-41da-992f-63e582133f01.png`,
    femaleSrc: `${base}/mobile_roll_manager_female-87e867cf-6e5c-4c7a-b896-0066df50aa68.png`,
    maleAlt: "Manager — male art",
    femaleAlt: "Manager — female art",
  },
];

export type PlayproveDesktopRoleHubProps = {
  userName?: string;
};

export function PlayproveDesktopRoleHub({ userName = "David" }: PlayproveDesktopRoleHubProps) {
  const [gender, setGender] = useState<PlayproveGender>("male");

  const cards = useMemo(
    () =>
      ROLE_CARDS.map((c) =>
        gender === "male"
          ? { ...c, imageSrc: c.maleSrc, imageAlt: c.maleAlt }
          : { ...c, imageSrc: c.femaleSrc, imageAlt: c.femaleAlt },
      ),
    [gender],
  );

  return (
    <PlayproveDesktopSetupShell
      userName={userName}
      steps={[
        { id: "gender", label: "Gender selection" },
        { id: "role", label: "Role selection" },
      ]}
      activeStepIndex={0}
      footerRight={<PlayproveSupportLink />}
    >
      <PlayproveGenderToggle value={gender} onChange={setGender} />
      <div className={styles.ppRoleGrid}>
        {cards.map((c) => (
          <PlayproveRoleSelectCard
            key={c.id}
            imageSrc={c.imageSrc}
            imageAlt={c.imageAlt}
            title={c.title}
            description={c.description}
            ctaLabel={c.cta}
            onCtaClick={() => {}}
          />
        ))}
      </div>
    </PlayproveDesktopSetupShell>
  );
}
