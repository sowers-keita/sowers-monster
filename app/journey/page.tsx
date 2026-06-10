"use client";

import BottomNav from "@/components/BottomNav";
import MonsterIcon from "@/components/MonsterIcon";
import { ActiveMonster, getMyActiveMonster } from "@/lib/game";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Step = "start" | "walking" | "registered" | "next";

export default function JourneyPage() {
  const router = useRouter();

  const [monster, setMonster] = useState<ActiveMonster | null>(null);
  const [step, setStep] = useState<Step>("start");
  const [message, setMessage] = useState("旅立ちの時が来た…");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMonster();
  }, []);

  async function loadMonster() {
    const current = await getMyActiveMonster();

    if (!current) {
      router.push("/login");
      return;
    }

    setMonster(current);
  }

  function wait(ms: number) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  async function startJourney() {
    if (!monster || saving) {
      return;
    }

    setSaving(true);
    setStep("walking");
    setMessage("たくさん育ててくれてありがとう。\nモンスターは旅に出ます。");

    await wait(1800);

    setMessage("夕焼けの道を\nゆっくり歩きはじめた…");

    await wait(2200);

    const createdAt = new Date(monster.created_at);
    const now = new Date();
    const daysRaised = Math.max(
      1,
      Math.ceil((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
    );

    const { count: winCount } = await supabase
      .from("battles")
      .select("*", { count: "exact", head: true })
      .eq("child_id", monster.child_id)
      .eq("result", "win");

    const { error: historyError } = await supabase
      .from("partner_history")
      .insert({
        child_id: monster.child_id,
        monster_name: monster.name,
        days_raised: daysRaised,
        battle_power: monster.battle_power,
        win_count: winCount || 0,
        season_id: monster.season_id
      });

    if (historyError) {
      alert(historyError.message);
      setSaving(false);
      return;
    }

    const { error: zukanError } = await supabase.from("zukan").insert({
      child_id: monster.child_id,
      monster_name: monster.name,
      monster_type:
        monster.egg_color === "red"
          ? "サル系"
          : monster.egg_color === "blue"
          ? "犬系"
          : "鳥系",
      stage: monster.stage,
      season_id: monster.season_id
    });

    if (zukanError) {
      alert(zukanError.message);
      setSaving(false);
      return;
    }

    const { error: monsterError } = await supabase
      .from("monsters")
      .update({ is_active: false })
      .eq("id", monster.id);

    if (monsterError) {
      alert(monsterError.message);
      setSaving(false);
      return;
    }

    setStep("registered");
    setMessage(`${monster.name}は旅立った！\n図鑑に登録された！`);

    await wait(1600);

    setStep("next");
    setMessage("新しい冒険が始まる！\n次の卵を選ぼう！");
    setSaving(false);
  }

  if (!monster) {
    return (
      <main className="page">
        <div className="phone">
          <div className="header">旅立ち</div>
          <div className="content">
            <div className="card">
              <div className="title">読み込み中…</div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const createdAt = new Date(monster.created_at);
  const now = new Date();
  const daysRaised = Math.max(
    1,
    Math.ceil((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
  );

  return (
    <main className="page">
      <div className="phone">
        <div className="header">旅立ち</div>

        <div className="content" style={{ paddingBottom: 92 }}>
          <div
            className="card"
            style={{
              textAlign: "center",
              background:
                step === "walking"
                  ? "linear-gradient(#ffb36b 0%, #ffd08a 45%, #795b82 75%, #33264f 100%)"
                  : step === "registered" || step === "next"
                  ? "linear-gradient(#1b2554 0%, #35245f 48%, #15162d 100%)"
                  : "#fff1cf",
              color:
                step === "registered" || step === "next" || step === "walking"
                  ? "white"
                  : "#2b1b10",
              minHeight: 340,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              overflow: "hidden"
            }}
          >
            <div
              style={{
                transform:
                  step === "walking"
                    ? "translateX(120px) scale(0.5)"
                    : "translateX(0) scale(1)",
                opacity: step === "walking" ? 0.25 : 1,
                transition: "2s ease"
              }}
            >
              <MonsterIcon
                color={monster.egg_color}
                size={130}
                stage={monster.stage}
                speed={monster.speed}
                technique={monster.technique}
              />
            </div>

            <div
              style={{
                marginTop: 18,
                fontSize: 24,
                fontWeight: 900,
                whiteSpace: "pre-line",
                lineHeight: 1.45
              }}
            >
              {message}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 14
            }}
          >
            <Record label="育成日数" value={`${daysRaised}日`} />
            <Record label="戦闘力" value={monster.battle_power} />
            <Record label="進化段階" value={monster.stage} />
            <Record label="名前" value={monster.name} />
          </div>

          {step === "start" && (
            <button className="button orange" onClick={startJourney}>
              旅立ちを見送る
            </button>
          )}

          {step === "next" && (
            <>
              <button
                className="button blue"
                onClick={() => router.push("/zukan")}
              >
                図鑑を見る
              </button>

              <button
                className="button"
                onClick={() => router.push("/egg-select")}
              >
                新しい卵を選ぶ
              </button>
            </>
          )}
        </div>
      </div>

      <BottomNav active="home" />
    </main>
  );
}

function Record({
  label,
  value
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div
      style={{
        background: "#fff1cf",
        border: "3px solid #2b1b10",
        borderRadius: 16,
        padding: "8px 4px",
        fontWeight: 900,
        color: "#2b1b10",
        textAlign: "center"
      }}
    >
      {label}
      <div style={{ fontSize: 22, color: "#ff4b35" }}>{value}</div>
    </div>
  );
}
