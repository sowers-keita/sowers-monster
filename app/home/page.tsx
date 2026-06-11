"use client";

import BottomNav from "@/components/BottomNav";
import MonsterIcon from "@/components/MonsterIcon";
import {
  SeedItem,
  SeedType,
  WeeklyRewardResult,
  claimWeeklyGameRewards,
  consumeSeed,
  gameLabels,
  getMySeeds,
  getSeedMaxIncrease,
  seedLabels
} from "@/lib/game";
import { supabase } from "@/lib/supabaseClient";
import { EggColor } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type HomeMonster = {
  id: string;
  child_id: string;
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
  created_at: string;
  last_growth_date?: string | null;
};

type TopRow = {
  id: string;
  name: string;
  battle_power: number;
  child_id: string;
  child_name: string;
};

const EVO_THRESHOLD: Record<string, number> = {
  スタート期: 20,
  ビギナー期: 60,
  ヒーロー期: 120
};
const NEXT_STAGE: Record<string, string> = {
  スタート期: "ビギナー期",
  ビギナー期: "ヒーロー期",
  ヒーロー期: "覚醒期"
};

type StatKey = "power" | "stamina" | "speed" | "technique";
const STATS: {
  key: StatKey;
  maxKey: "power_max" | "stamina_max" | "speed_max" | "technique_max";
  label: string;
  color: string;
  train: "friend" | "running" | "stop" | "thread";
}[] = [
  { key: "power", maxKey: "power_max", label: "パワー", color: "#ff4b35", train: "friend" },
  { key: "stamina", maxKey: "stamina_max", label: "スタミナ", color: "#34b85a", train: "running" },
  { key: "speed", maxKey: "speed_max", label: "スピード", color: "#2f8ee5", train: "stop" },
  { key: "technique", maxKey: "technique_max", label: "テクニック", color: "#9b51e0", train: "thread" }
];

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function daysUntilDeparture(createdAt: string): number {
  const dep = new Date(createdAt);
  dep.setMonth(dep.getMonth() + 1);
  dep.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((dep.getTime() - today.getTime()) / 86400000);
}

export default function HomePage() {
  const router = useRouter();

  const [monster, setMonster] = useState<HomeMonster | null>(null);
  const [childName, setChildName] = useState("");
  const [seeds, setSeeds] = useState<SeedItem[]>([]);
  const [top5, setTop5] = useState<TopRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [happy, setHappy] = useState(false);
  const [evolving, setEvolving] = useState<"none" | "glow" | "done">("none");
  const [weeklyRewards, setWeeklyRewards] = useState<WeeklyRewardResult[]>([]);
  const [busyStat, setBusyStat] = useState<StatKey | "">("");
  const [flashStat, setFlashStat] = useState<StatKey | "">("");

  useEffect(() => {
    loadHome();
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      window.setTimeout(() => setHappy(true), 3300);
      window.setTimeout(() => setHappy(false), 4300);
    }, 4800);
    return () => window.clearInterval(id);
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

    try {
      const awarded = await claimWeeklyGameRewards(child.id);
      if (awarded.length > 0) {
        setWeeklyRewards(awarded);
      }
    } catch {
      // 続行
    }

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

    let m = activeMonster as HomeMonster;

    // 1日にそれぞれの限界値が +1 ずつ成長
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);

    if (m.last_growth_date) {
      const last = new Date(m.last_growth_date);
      last.setHours(0, 0, 0, 0);
      const days = Math.floor((today.getTime() - last.getTime()) / 86400000);
      if (days > 0) {
        const grown = {
          power_max: m.power_max + days,
          stamina_max: m.stamina_max + days,
          speed_max: m.speed_max + days,
          technique_max: m.technique_max + days,
          last_growth_date: todayStr
        };
        await supabase.from("monsters").update(grown).eq("id", m.id);
        m = { ...m, ...grown };
      }
    } else {
      await supabase
        .from("monsters")
        .update({ last_growth_date: todayStr })
        .eq("id", m.id);
      m = { ...m, last_growth_date: todayStr };
    }

    setMonster(m);

    try {
      setSeeds(await getMySeeds());
    } catch {
      // 続行
    }

    const { data: topData } = await supabase
      .from("monsters")
      .select("id, name, battle_power, child_id, children ( name )")
      .eq("is_active", true)
      .order("battle_power", { ascending: false })
      .limit(5);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setTop5(
      ((topData || []) as any[]).map((r) => ({
        id: r.id,
        name: r.name,
        battle_power: r.battle_power,
        child_id: r.child_id,
        child_name: r.children?.name || "なまえ未設定"
      }))
    );

    setLoading(false);
  }

  async function saveName() {
    if (!monster || savingName) return;
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

  // 種をつかって限界値アップ（ステータス枠の中で）
  async function powerUp(
    stat: StatKey,
    field: "power_max" | "stamina_max" | "speed_max" | "technique_max"
  ) {
    if (!monster || busyStat) return;
    const seed = seeds.find((s) => s.seed_type === stat && s.count > 0);
    if (!seed) return;

    setBusyStat(stat);
    const inc = getSeedMaxIncrease(stat as SeedType);
    const newMax = (monster[field] as number) + inc;

    try {
      await consumeSeed(seed.id, seed.count - 1);
      await supabase.from("monsters").update({ [field]: newMax }).eq("id", monster.id);
      setMonster({ ...monster, [field]: newMax } as HomeMonster);
      setSeeds((prev) =>
        prev.map((s) => (s.id === seed.id ? { ...s, count: s.count - 1 } : s))
      );
      setFlashStat(stat);
      window.setTimeout(() => setFlashStat(""), 700);
    } catch (e) {
      alert(e instanceof Error ? e.message : "失敗しました");
    }
    setBusyStat("");
  }

  async function evolve() {
    if (!monster || evolving !== "none") return;
    const ns = NEXT_STAGE[monster.stage];
    if (!ns) return;

    setEvolving("glow");
    await sleep(1300);

    const updated = {
      stage: ns,
      power_max: monster.power_max + 20,
      stamina_max: monster.stamina_max + 20,
      speed_max: monster.speed_max + 20,
      technique_max: monster.technique_max + 20
    };

    const { error } = await supabase
      .from("monsters")
      .update(updated)
      .eq("id", monster.id);
    if (error) {
      alert(error.message);
      setEvolving("none");
      return;
    }
    setMonster({ ...monster, ...updated });
    setEvolving("done");
  }

  if (loading || !monster) {
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

  const daysLeft = daysUntilDeparture(monster.created_at);
  const departureReady = daysLeft <= 0;

  const total =
    monster.power + monster.stamina + monster.speed + monster.technique;
  const threshold = EVO_THRESHOLD[monster.stage];
  const canEvolve = threshold !== undefined && total >= threshold;
  const evoRemain = threshold !== undefined ? Math.max(0, threshold - total) : 0;
  const evoPercent =
    threshold !== undefined ? Math.min(100, Math.round((total / threshold) * 100)) : 100;
  const isMaxStage = NEXT_STAGE[monster.stage] === undefined;

  const totalSeeds = seeds.reduce((a, s) => a + s.count, 0);
  const seedCount = (stat: StatKey) =>
    seeds.find((s) => s.seed_type === stat)?.count || 0;

  return (
    <main className="page">
      <style>{`
@keyframes evo-glow{0%{filter:brightness(1);transform:scale(1);}45%{filter:brightness(3.5);transform:scale(1.18);}100%{filter:brightness(1.4);transform:scale(1.05);}}
.evo-glow{animation:evo-glow 1.3s ease-in-out forwards;}
@keyframes evo-pop{0%{transform:scale(.4);opacity:0;}60%{transform:scale(1.12);opacity:1;}100%{transform:scale(1);}}
.evo-pop{animation:evo-pop .5s ease-out;}
@keyframes evo-pulse{0%,100%{transform:scale(1);}50%{transform:scale(1.04);}}
.evo-ready{animation:evo-pulse 1s ease-in-out infinite;}
@keyframes stat-flash{0%{box-shadow:0 0 0 0 rgba(255,210,60,.9);}100%{box-shadow:0 0 0 14px rgba(255,210,60,0);}}
.stat-flash{animation:stat-flash .7s ease-out;}
`}</style>

      <div className="phone">
        {/* ===== ヘッダー ===== */}
        <div
          className="header"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <MonsterIcon
              color={monster.egg_color}
              size={30}
              stage={monster.stage}
              speed={monster.speed}
              technique={monster.technique}
            />
            <span style={{ fontSize: 19, fontWeight: 900 }}>Sowers Monster</span>
          </div>
          <div
            onClick={() => router.push("/inventory")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "rgba(255,255,255,0.22)",
              border: "2px solid rgba(255,255,255,0.6)",
              borderRadius: 999,
              padding: "3px 10px",
              fontSize: 14,
              fontWeight: 900,
              cursor: "pointer",
              zIndex: 1
            }}
          >
            🌱 {totalSeeds}
          </div>
        </div>

        <div className="content" style={{ paddingBottom: 96 }}>
          {/* ===== ヒーロー（キャラ・名前・旅立ち） ===== */}
          <div
            className="card"
            style={{ padding: 12, textAlign: "center", background: "#fff7e9" }}
          >
            <div className="monster-stage">
              <div className="scene-cloud" style={{ top: 14, left: 28 }} />
              <div className="scene-cloud" style={{ top: 26, right: 30, width: 50 }} />
              <div className="scene-mountain left" />
              <div className="scene-mountain mid" />
              <div className="scene-mountain right" />
              <div className="scene-grass" />

              {/* 進化段階バッジ（左上） */}
              <div
                style={{
                  position: "absolute",
                  top: 8,
                  left: 8,
                  zIndex: 6,
                  background: "#ff7a00",
                  color: "white",
                  border: "2px solid #2b1b10",
                  borderRadius: 999,
                  padding: "3px 10px",
                  fontSize: 12,
                  fontWeight: 900,
                  boxShadow: "0 2px 0 #2b1b10"
                }}
              >
                {monster.stage}
              </div>

              {/* 旅立ちバッジ（右上・枠に統合） */}
              <div
                onClick={() => departureReady && router.push("/journey")}
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  zIndex: 6,
                  background: departureReady ? "#ff3b30" : "rgba(43,27,16,0.78)",
                  color: "white",
                  border: "2px solid #2b1b10",
                  borderRadius: 999,
                  padding: "3px 10px",
                  fontSize: 12,
                  fontWeight: 900,
                  boxShadow: "0 2px 0 #2b1b10",
                  cursor: departureReady ? "pointer" : "default"
                }}
              >
                {departureReady ? "旅立ちの日！" : `旅立ちまであと${daysLeft}日`}
              </div>

              <div className="monster-walker">
                <div className="monster-hopper">
                  <MonsterIcon
                    color={monster.egg_color}
                    size={128}
                    happy={happy}
                    stage={monster.stage}
                    speed={monster.speed}
                    technique={monster.technique}
                  />
                </div>
                <div className="monster-shadow" />
              </div>
            </div>

            {!editingName ? (
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8
                }}
              >
                <span style={{ fontSize: 24, fontWeight: 900, color: "#2b1b10" }}>
                  {monster.name}
                </span>
                <button
                  onClick={() => {
                    setNameInput(monster.name);
                    setEditingName(true);
                  }}
                  style={{
                    border: "2px solid #2b1b10",
                    background: "white",
                    color: "#2b1b10",
                    borderRadius: 999,
                    width: 30,
                    height: 30,
                    fontSize: 14,
                    cursor: "pointer"
                  }}
                  aria-label="なまえを変更"
                >
                  ✏️
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

            {!editingName && (
              <div className="note" style={{ marginTop: 2 }}>
                {childName}さんのモンスター
              </div>
            )}
          </div>

          {/* ===== つよくなる（進化＋ステータス＋種強化） ===== */}
          <div className="card">
            {/* 進化ゲージ */}
            {canEvolve ? (
              <button
                className="button evo-ready"
                onClick={evolve}
                style={{
                  marginTop: 0,
                  marginBottom: 14,
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,.4), rgba(255,255,255,0) 46%), linear-gradient(180deg,#ffce3a,#ff9d00)",
                  color: "#2b1b10",
                  textShadow: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10
                }}
              >
                <span style={{ fontSize: 26 }}>✨</span> しんかする！
              </button>
            ) : isMaxStage ? (
              <div
                style={{
                  textAlign: "center",
                  fontWeight: 900,
                  color: "#ff7a00",
                  marginBottom: 12
                }}
              >
                ✨ さいごの すがた ✨
              </div>
            ) : (
              <div style={{ marginBottom: 14 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    fontWeight: 900,
                    color: "#2b1b10",
                    marginBottom: 4
                  }}
                >
                  <span>つぎの進化まで</span>
                  <span>あと {evoRemain}</span>
                </div>
                <div className="status-bar">
                  <div
                    className="status-fill"
                    style={{
                      width: `${evoPercent}%`,
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,.45), rgba(255,255,255,0) 55%), linear-gradient(90deg,#ffce3a,#ff7a00)"
                    }}
                  />
                </div>
              </div>
            )}

            {/* ステータス＋強化ボタン */}
            {STATS.map((s) => {
              const cur = monster[s.key] as number;
              const mx = monster[s.maxKey] as number;
              const percent = mx > 0 ? Math.min(100, Math.round((cur / mx) * 100)) : 0;
              const have = seedCount(s.key);
              return (
                <div key={s.key} style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13,
                      fontWeight: 900,
                      marginBottom: 4
                    }}
                  >
                    <span style={{ color: s.color }}>{s.label}</span>
                    <span style={{ color: "#2b1b10" }}>
                      {cur} / {mx}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto auto",
                      gap: 6,
                      alignItems: "center"
                    }}
                  >
                    <div
                      className={`status-bar ${flashStat === s.key ? "stat-flash" : ""}`}
                    >
                      <div
                        className="status-fill"
                        style={{ width: `${percent}%`, background: s.color }}
                      />
                    </div>
                    <button
                      onClick={() => powerUp(s.key, s.maxKey)}
                      disabled={have <= 0 || busyStat === s.key}
                      style={{
                        height: 32,
                        padding: "0 9px",
                        borderRadius: 10,
                        border: "2px solid #2b1b10",
                        background: have > 0 ? "#ffe9a8" : "#eee",
                        color: "#2b1b10",
                        fontSize: 13,
                        fontWeight: 900,
                        opacity: have > 0 ? 1 : 0.5,
                        whiteSpace: "nowrap",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4
                      }}
                    >
                      <MiniSeed seedType={s.key} />
                      {have}
                    </button>
                    <button
                      onClick={() => router.push(`/training?t=${s.train}`)}
                      style={{
                        height: 32,
                        width: 36,
                        borderRadius: 10,
                        border: "2px solid #2b1b10",
                        background: s.color,
                        color: "white",
                        fontSize: 14,
                        fontWeight: 900
                      }}
                      aria-label="きたえる"
                    >
                      💪
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ===== バトル（戦闘力＋上位5名＋ボタン） ===== */}
          <div className="card">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 900, color: "#2b1b10" }}>
                バトル
              </span>
              <span
                style={{
                  background: "#fff1cf",
                  border: "2px solid #2b1b10",
                  borderRadius: 999,
                  padding: "4px 12px",
                  fontWeight: 900,
                  color: "#2b1b10"
                }}
              >
                戦闘力{" "}
                <span style={{ color: "#ff4b35", fontSize: 18 }}>
                  {monster.battle_power}
                </span>
              </span>
            </div>

            <div
              style={{
                background: "#2b1b10",
                color: "white",
                borderRadius: 12,
                padding: "5px 10px",
                fontSize: 13,
                fontWeight: 900,
                marginBottom: 8
              }}
            >
              🏆 今のTOP5
            </div>

            <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
              {top5.length === 0 && (
                <div className="note" style={{ margin: 0 }}>
                  まだランキングがありません
                </div>
              )}
              {top5.map((row, i) => {
                const mine = row.id === monster.id;
                return (
                  <div
                    key={row.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "28px 1fr auto",
                      gap: 8,
                      alignItems: "center",
                      background: mine ? "#ffe0a3" : "#faf6ef",
                      border: "2px solid #2b1b10",
                      borderRadius: 12,
                      padding: "5px 8px",
                      outline: mine ? "2px solid #ff7a00" : "none"
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 900,
                        color:
                          i === 0
                            ? "#e3a400"
                            : i === 1
                            ? "#8a8a8a"
                            : i === 2
                            ? "#c2772f"
                            : "#2b1b10"
                      }}
                    >
                      {i + 1}位
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 900,
                        color: "#2b1b10",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}
                    >
                      {row.name}
                      <span style={{ color: "#8a6b4f", fontWeight: 800 }}>
                        {" "}
                        ・{row.child_name}
                      </span>
                    </span>
                    <span style={{ fontWeight: 900, color: "#ff4b35" }}>
                      {row.battle_power}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="button red"
                style={{ flex: 1, marginTop: 0, fontSize: 17 }}
                onClick={() => router.push("/battle?mode=online")}
              >
                ⚔️ すぐにバトル
              </button>
              <button
                className="button blue"
                style={{ flex: 1, marginTop: 0, fontSize: 17 }}
                onClick={() => router.push("/versus")}
              >
                👥 友達とバトル
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 先週のミニゲーム上位3人 種ゲット！ */}
      {weeklyRewards.length > 0 && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "rgba(18,10,28,0.88)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            textAlign: "center"
          }}
        >
          <div style={{ fontSize: 54 }}>🏆</div>
          <div
            style={{
              color: "white",
              fontSize: 24,
              fontWeight: 900,
              marginTop: 8,
              lineHeight: 1.5
            }}
          >
            先週のミニゲーム ランキング！
          </div>
          <div
            style={{
              marginTop: 16,
              width: "100%",
              maxWidth: 320,
              display: "grid",
              gap: 10
            }}
          >
            {weeklyRewards.map((r) => (
              <div
                key={r.gameType}
                style={{
                  background: "white",
                  border: "4px solid #2b1b10",
                  borderRadius: 16,
                  padding: 12,
                  fontWeight: 900,
                  color: "#2b1b10"
                }}
              >
                {gameLabels[r.gameType]} {r.rank}位！
                <div style={{ color: "#ff7a00", marginTop: 4 }}>
                  🌱 {seedLabels[r.seed]} を 1こ ゲット！
                </div>
              </div>
            ))}
          </div>
          <button
            className="button"
            style={{ maxWidth: 260, marginTop: 20 }}
            onClick={() => setWeeklyRewards([])}
          >
            やったー！
          </button>
        </div>
      )}

      {/* 進化アニメーション */}
      {evolving !== "none" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(18,10,28,0.88)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            textAlign: "center"
          }}
        >
          <div className={evolving === "glow" ? "evo-glow" : "evo-pop"}>
            <MonsterIcon
              color={monster.egg_color}
              size={200}
              stage={monster.stage}
              speed={monster.speed}
              technique={monster.technique}
              happy={evolving === "done"}
            />
          </div>
          <div
            style={{
              color: "white",
              fontSize: 26,
              fontWeight: 900,
              marginTop: 20,
              lineHeight: 1.5
            }}
          >
            {evolving === "glow"
              ? "しんか している…"
              : `✨ ${monster.stage} に しんかした！`}
          </div>
          {evolving === "done" && (
            <button
              className="button"
              style={{ maxWidth: 260, marginTop: 20 }}
              onClick={() => setEvolving("none")}
            >
              やったー！
            </button>
          )}
        </div>
      )}

      <BottomNav active="home" />
    </main>
  );
}

// 持ち物画面と同じ「芽が出た種」アイコン（能力ごとに色ちがい）の小サイズ版
function MiniSeed({ seedType }: { seedType: StatKey }) {
  const bg =
    seedType === "power"
      ? "linear-gradient(135deg, #ff3d25, #ff8a00)"
      : seedType === "stamina"
      ? "linear-gradient(135deg, #1383ff, #22c0ff)"
      : seedType === "speed"
      ? "linear-gradient(135deg, #42b72a, #b9ff35)"
      : "linear-gradient(135deg, #6f2dd8, #cc76ff)";

  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        width: 15,
        height: 19,
        borderRadius: "50% 50% 44% 44%",
        border: "2px solid #2b1b10",
        background: bg,
        boxShadow: "inset -3px -3px 0 rgba(0,0,0,0.15)"
      }}
    >
      <span
        style={{
          position: "absolute",
          left: 3,
          top: -4,
          width: 9,
          height: 6,
          background: "#54b83f",
          border: "1.5px solid #2b1b10",
          borderRadius: "50% 50% 35% 35%",
          transform: "rotate(-8deg)"
        }}
      />
    </span>
  );
}
