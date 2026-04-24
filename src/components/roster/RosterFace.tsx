"use client";

function initials(fullName: string): string {
  const s = fullName.replace(/\s+/g, "").trim();
  if (!s) return "?";
  if (s.length <= 2) return s;
  return s.slice(-2);
}

type RosterFaceProps = {
  name: string;
  photoUrl: string | null;
  size?: number;
};

export function RosterFace({ name, photoUrl, size = 40 }: RosterFaceProps) {
  const s = size;
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        width={s}
        height={s}
        style={{
          width: s,
          height: s,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
          border: "1px solid var(--gray-200)",
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: s,
        height: s,
        borderRadius: "50%",
        background: "var(--primary)",
        color: "var(--white)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.round(s * 0.38),
        fontWeight: 800,
        flexShrink: 0,
      }}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
