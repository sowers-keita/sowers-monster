"use client";

import { useRouter } from "next/navigation";

type BottomNavProps = {
  active: "home" | "versus" | "ranking" | "mission" | "inventory";
};

export default function BottomNav({ active }: BottomNavProps) {
  const router = useRouter();

  const items = [
    { key: "home", label: "ホーム", href: "/home" },
    { key: "versus", label: "対戦", href: "/versus" },
    { key: "ranking", label: "ランキング", href: "/ranking" },
    { key: "mission", label: "ミッション", href: "/mission" },
    { key: "inventory", label: "持ち物", href: "/inventory" }
  ] as const;

  return (
    <div className="bottom-nav">
      {items.map((item) => (
        <button
          key={item.key}
          className={`nav-item ${active === item.key ? "active" : ""}`}
          onClick={() => router.push(item.href)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
