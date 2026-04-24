/** Default copy + art for mobile path / role carousels (male persona set). */

export type PlayprovePathSlide = {
  id: string;
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
};

const base = "/playprove";

export const PLAYPROVE_PATH_SLIDES_ROLE_MALE: PlayprovePathSlide[] = [
  {
    id: "player",
    title: "Player",
    description: "Train smarter, track progress, and sharpen your skills.",
    imageSrc: `${base}/mobile_roll_player_male-5befa568-9f41-47ea-8e77-aa7ea1dc5ab3.png`,
    imageAlt: "Playprove player path",
  },
  {
    id: "coach",
    title: "Coach",
    description: "Develop game playbooks, mentor players, and lead game strategy.",
    imageSrc: `${base}/mobile_roll_coach_male-04d845ed-b7c3-435f-acd0-8b0dca295f55.png`,
    imageAlt: "Playprove coach path",
  },
  {
    id: "manager",
    title: "Manager / Staff",
    description: "Streamline logistics, manage schedules, and coordinate team administration.",
    imageSrc: `${base}/mobile_roll_manager_male-8c6fd2e0-efac-41da-992f-63e582133f01.png`,
    imageAlt: "Playprove manager path",
  },
];

export const PLAYPROVE_PATH_SLIDES_GROWTH_MALE: PlayprovePathSlide[] = [
  {
    id: "personal",
    title: "Personal growth",
    description:
      "Maximize your individual fitness with personalized training plans and comprehensive record management.",
    imageSrc: `${base}/mobile_roll_personal_male-362e2bd9-4379-4d4c-a71d-13df11d82b3a.png`,
    imageAlt: "Personal growth path",
  },
  ...PLAYPROVE_PATH_SLIDES_ROLE_MALE,
];

export const PLAYPROVE_DESKTOP_LOGIN_HERO = `${base}/desktop_Login-d4d9d02c-7a6a-4262-9180-ba211007e3d3.png`;

export const PLAYPROVE_DESKTOP_ROLE_BANNER = `${base}/desktop_roll_select-79730717-1942-4fc2-8a58-8ea5bd1c2156.png`;
