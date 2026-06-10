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
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);

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

  async function saveName() {
    if (!monster || savingName) {
      return;
    }

    const newName = nameInput.trim();

    if (!newName) {
      alert("名前を入力してください");
      return;
    }

    setSavingName(true);

    const { error } = await supabase
      .from("monsters")
      .update({ name: newName })
      .eq("id", monster.id);

    if (error) {
      alert(error.message);
      setSavingName(false);
      return;
    }

    setMonster({ ...monster, name: newName });
    setEditingName(false);
    setSavingName(false);
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
            <div className="monster-stage">
              {/* 背景：雲・山・うっすら海・草原 */}
              <div className="scene-cloud" style={{ top: 14, left: 28 }} />
              <div className="scene-cloud" style={{ top: 26, right: 30, width: 50 }} />
              <div className="scene-mountain left" />
              <div className="scene-mountain mid" />
              <div className="scene-mountain right" />
              <div className="scene-grass" />

              <div className="monster-walker">
                <div className="monster-hopper">
                  <MonsterIcon color={monster.egg_color} size={130} />
                </div>
                <div className="monster-shadow" />
              </div>
            </div>

            {!editingName ? (
              <div style={{ marginTop: 10 }}>
                <div className="title" style={{ margin: 0 }}>
                  {monster.name}
                </div>
                <button
                  onClick={() => {
                    setNameInput(monster.name);
                    setEditingName(true);
                  }}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#9a8266",
                    fontSize: 12,
                    fontWeight: 700,
                    textDecoration: "underline",
                    padding: "2px 4px",
                    marginTop: 2,
                    cursor: "pointer"
                  }}
                >
                  なまえを変更
                </button>
              </div>
            ) : (
              <div style={{ marginTop: 10 }}>
                <input
                  className="input"
                  value={nameInput}
                  onChange={(event) => setNameInput(event.target.value)}
                  maxLength={12}
                  placeholder="あたらしいなまえ"
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="button"
                    onClick={saveName}
                    disabled={savingName}
                    style={{ flex: 1 }}
                  >
                    {savingName ? "保存中…" : "保存"}
                  </button>
                  <button
                    className="button gray"
                    onClick={() => setEditingName(false)}
                    style={{ flex: 1 }}
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            )}

            <div
              style={{
                display: "inline-block",
                marginTop: 8,
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
              color="#ff4b35"
            />

            <Status
              label="スタミナ"
              current={monster.stamina}
              max={monster.stamina_max}
              color="#34b85a"
            />

            <Status
              label="スピード"
              current={monster.speed}
              max={monster.speed_max}
              color="#2f8ee5"
            />

            <Status
              label="テクニック"
              current={monster.technique}
              max={monster.technique_max}
              color="#9b51e0"
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

          <button className="button" onClick={() => router.push("/mission")}>
            ミッション
          </button>

          <button className="button orange" onClick={() => router.push("/training")}>
            トレーニング
          </button>

          <button className="button red" onClick={() => router.push("/battle")}>
            バトル
          </button>

          <button className="button blue" onClick={() => router.push("/inventory")}>
            持ち物
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
  max,
  color
}: {
  label: string;
  current: number;
  max: number;
  color: string;
}) {
  const percent = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;

  return (
    <div className="status-row">
      <div className="status-label">
        <span style={{ color }}>{label}</span>
        <span>
          {current} / {max}
        </span>
      </div>

      <div className="status-bar">
        <div
          className="status-fill"
          style={{ width: `${percent}%`, background: color }}
        />
      </div>
    </div>
  );
}
