"use client";

import BottomNav from "@/components/BottomNav";
import MonsterIcon from "@/components/MonsterIcon";
import { supabase } from "@/lib/supabaseClient";
import { EggColor } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type HomeMonster = {
  id: string;
  name: string;
  egg_color: EggColor;
  stage: string;
  power: number;
  power_max: number;
  stamina: number;
  stamina_max: number;
  speed: number;
  speed_max: number;
  technique: number;
  technique_max: number;
  battle_power: number;
};

export default function HomePage() {
  const router = useRouter();

  const [monster, setMonster] = useState<HomeMonster | null>(null);
  const [childName, setChildName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHome();
  }, []);

  async function loadHome() {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;

    if (!userId) {
      router.push("/login");
      return;
    }

    const { data: child } = await supabase
      .from("children")
      .select("id, name")
      .eq("parent_id", userId)
      .limit(1)
      .single();

    if (!child) {
      router.push("/register-child");
      return;
    }

    setChildName(child.name);

    const { data: activeMonster } = await supabase
      .from("monsters")
      .select("*")
      .eq("child_id", child.id)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (!activeMonster) {
      router.push("/egg-select");
      return;
    }

    setMonster(activeMonster as HomeMonster);
    setLoading(false);
  }

  if (loading) {
    return (
      <main className="page">
        <div className="phone">
          <div className="header">Sowers Monster</div>
          <div className="content">
            <div className="card">
              <div className="title">読み込み中…</div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!monster) {
    return null;
  }

  return (
    <main className="page">
      <div className="phone">
        <div className="header">Sowers Monster</div>

        <div className="content" style={{ paddingBottom: 92 }}>
          <div className="card" style={{ textAlign: "center", background: "#fff1cf" }}>
            <MonsterIcon color={monster.egg_color} size={130} />

            <div className="title" style={{ marginTop: 10 }}>
              {monster.name}
            </div>

            <div
              style={{
                display: "inline-block",
                background: "#ff7a00",
                color: "white",
                border: "3px solid #2b1b10",
                borderRadius: 999,
                padding: "6px 14px",
                fontWeight: 900
              }}
            >
              {monster.stage}
            </div>

            <div className="note">{childName}さんのモンスター</div>
          </div>

          <div className="card">
            <div className="title">ステータス</div>

            <Status
              label="パワー"
              current={monster.power}
              max={monster.power_max}
            />

            <Status
              label="スタミナ"
              current={monster.stamina}
              max={monster.stamina_max}
            />

            <Status
              label="スピード"
              current={monster.speed}
              max={monster.speed_max}
            />

            <Status
              label="テクニック"
              current={monster.technique}
              max={monster.technique_max}
            />
          </div>

          <div className="card">
            <div className="title">バトル情報</div>

            <div
              style={{
                background: "#fff1cf",
                border: "3px solid #2b1b10",
                borderRadius: 16,
                padding: 14,
                textAlign: "center",
                fontWeight: 900
              }}
            >
              戦闘力
              <div style={{ fontSize: 34, color: "#ff4b35" }}>
                {monster.battle_power}
              </div>
            </div>
          </div>

          <button className="button orange" onClick={() => router.push("/training")}>
            トレーニング
          </button>

          <button className="button blue" onClick={() => router.push("/inventory")}>
            持ち物
          </button>

          <button className="button" onClick={() => router.push("/battle")}>
            バトル
          </button>

          <button className="button orange" onClick={() => router.push("/zukan")}>
            図鑑
          </button>
        </div>
      </div>

      <BottomNav active="home" />
    </main>
  );
}

function Status({
  label,
  current,
  max
}: {
  label: string;
  current: number;
  max: number;
}) {
  const percent = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;

  return (
    <div className="status-row">
      <div className="status-label">
        <span>{label}</span>
        <span>
          {current} / {max}
        </span>
      </div>

      <div className="status-bar">
        <div className="status-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
