"use client";

import { useRouter } from "next/navigation";

type NavKey =
  | "home"
  | "mission"
  | "training"
  | "inventory"
  | "battle"
  | "zukan"
  | "ranking";

type BottomNavProps = {
  active: NavKey;
};

const items: {
  key: NavKey;
  label: string;
  icon: string;
  href: string;
  color: string;
}[] = [
  { key: "home", label: "ホーム", icon: "🏠", href: "/home", color: "#ff7a00" },
  { key: "mission", label: "ミッション", icon: "🎯", href: "/mission", color: "#34b85a" },
  { key: "training", label: "トレーニング", icon: "💪", href: "/training", color: "#ff4b35" },
  { key: "battle", label: "バトル", icon: "⚔️", href: "/battle", color: "#9b51e0" },
  { key: "ranking", label: "ランキング", icon: "🏆", href: "/ranking", color: "#e0398a" },
  { key: "inventory", label: "もちもの", icon: "🎒", href: "/inventory", color: "#2f8ee5" },
  { key: "zukan", label: "ずかん", icon: "📖", href: "/zukan", color: "#c08a2d" }
];

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
              minWidth: 66,
              border: isActive ? "none" : `2px solid ${item.color}`,
              background: isActive ? item.color : "white",
              color: isActive ? "white" : item.color,
              borderRadius: 14,
              padding: "5px 6px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              cursor: "pointer",
              lineHeight: 1
            }}
          >
            <span style={{ fontSize: 28, lineHeight: 1 }} aria-hidden>
              {item.icon}
            </span>
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
