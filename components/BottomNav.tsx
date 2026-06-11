"use client";

import { useRouter } from "next/navigation";

type NavKey =
  | "home"
  | "mission"
  | "training"
  | "battle"
  | "ranking"
  | "inventory"
  | "zukan";

type BottomNavProps = {
  active: NavKey;
};

const items: {
  key: NavKey;
  label: string;
  href: string;
  color: string;
}[] = [
  { key: "home", label: "ホーム", href: "/home", color: "#ff7a00" },
  { key: "mission", label: "ミッション", href: "/mission", color: "#34b85a" },
  { key: "training", label: "トレーニング", href: "/training", color: "#ff4b35" },
  { key: "battle", label: "バトル", href: "/battle", color: "#9b51e0" },
  { key: "ranking", label: "ランキング", href: "/ranking", color: "#e0398a" },
  { key: "inventory", label: "もちもの", href: "/inventory", color: "#2f8ee5" },
  { key: "zukan", label: "ずかん", href: "/zukan", color: "#c08a2d" }
];

// 統一感のある自作アイコン（currentColorで色が変わる）
function NavIcon({ name }: { name: NavKey }) {
  const common = {
    width: 26,
    height: 26,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.1,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  };

  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5.5 10.5V20h13v-9.5" />
          <path d="M10 20v-5h4v5" />
        </svg>
      );
    case "mission":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.2" />
          <circle cx="12" cy="12" r="4.4" />
          <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "training":
      return (
        <svg {...common}>
          <path d="M6.5 9v6M4 10.5v3M17.5 9v6M20 10.5v3" />
          <path d="M7 12h10" />
        </svg>
      );
    case "battle":
      return (
        <svg {...common}>
          <path d="M14.5 4H20v5.5L10.5 19l-2.5-2.5z" />
          <path d="M4 18.5 6.5 16M7.5 13.5 10 16" />
        </svg>
      );
    case "ranking":
      return (
        <svg {...common}>
          <path d="M8 4h8v4.5a4 4 0 0 1-8 0z" />
          <path d="M8 5.5H5.2a3 3 0 0 0 3 3M16 5.5h2.8a3 3 0 0 1-3 3" />
          <path d="M12 12.5v3M9.5 19.5h5l.6-2.5h-6.2z" />
        </svg>
      );
    case "inventory":
      return (
        <svg {...common}>
          <path d="M6 8.5h12l1 11H5z" />
          <path d="M9 8.5a3 3 0 0 1 6 0" />
        </svg>
      );
    case "zukan":
      return (
        <svg {...common}>
          <path d="M5.5 5a2 2 0 0 1 2-2H18v15H7.5a2 2 0 0 0-2 2z" />
          <path d="M5.5 5v15M10 7h4" />
        </svg>
      );
  }
}

export default function BottomNav({ active }: BottomNavProps) {
  const router = useRouter();

  return (
    <div
      className="bottom-nav"
      style={{
        display: "flex",
        justifyContent: "flex-start",
        alignItems: "stretch",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        gap: 4
      }}
    >
      {items.map((item) => {
        const isActive = active === item.key;
        return (
          <button
            key={item.key}
            onClick={() => router.push(item.href)}
            style={{
              flex: "0 0 auto",
              minWidth: 64,
              border: isActive ? "none" : `2px solid ${item.color}`,
              background: isActive ? item.color : "white",
              color: isActive ? "white" : item.color,
              borderRadius: 16,
              padding: "6px 6px 5px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              cursor: "pointer",
              lineHeight: 1,
              boxShadow: isActive ? "0 3px 0 rgba(0,0,0,0.18)" : "none"
            }}
          >
            <NavIcon name={item.key} />
            <span
              style={{ fontSize: 11, fontWeight: 900, whiteSpace: "nowrap" }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
