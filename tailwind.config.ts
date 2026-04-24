import type { Config } from "tailwindcss";

/**
 * Tailwind: 신규·개편 UI는 유틸 우선. 레거시 `style.css` 등과 reset 충돌을 막기 위해 preflight 끔.
 * 점진적으로 `className`에 유틸 추가 → 큰 덩어리는 `@apply` 또는 CSS module로 승격 검토.
 */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        app: {
          surface: "var(--app-surface)",
          "surface-muted": "var(--app-surface-muted)",
          border: "var(--app-border)",
          text: "var(--app-text)",
          "text-muted": "var(--app-text-muted)",
        },
      },
      borderRadius: {
        app: "var(--app-radius)",
        "app-sm": "var(--app-radius-sm)",
      },
      boxShadow: {
        app: "var(--app-shadow)",
      },
    },
  },
  plugins: [],
} satisfies Config;
