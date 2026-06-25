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
import { isSaved, updateAccountTokens } from "@/lib/accounts";
import { EggColor } from "@/lib/types";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

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
  egg_color: EggColor;
  stage: string;
  speed: number;
  technique: number;
};

// 進化に必要な「4つの能力の合計」
const EVO_THRESHOLD: Record<string, number> = {
  スタート期: 100,
  ビギナー期: 250,
  ヒーロー期: 400
};
const NEXT_STAGE: Record<string, string> = {
  スタート期: "ビギナー期",
  ビギナー期: "ヒーロー期",
  ヒーロー期: "覚醒期"
};

// ホームのキャラ表示サイズ（進化するほど 少し大きく）
const STAGE_SIZE: Record<string, number> = {
  スタート期: 70,
  ビギナー期: 116,
  ヒーロー期: 138,
  覚醒期: 158
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

// はじめての人むけ チュートリアル（漢字＋ふりがな）
type Slide = { icon: string; title: ReactNode; text: ReactNode };
const SLIDES: Slide[] = [
  {
    icon: "🥚✨",
    title: "ようこそ！",
    text: (
      <>
        たねもんへ ようこそ！
        <br />
        <ruby>自分<rt>じぶん</rt></ruby>だけの モンスターを
        <br />
        <ruby>育<rt>そだ</rt></ruby>てる ゲームだよ。
      </>
    )
  },
  {
    icon: "🐣",
    title: (
      <>
        <ruby>育<rt>そだ</rt></ruby>てよう
      </>
    ),
    text: (
      <>
        トレーニングや バトルで
        <br />
        モンスターを <ruby>強<rt>つよ</rt></ruby>く <ruby>育<rt>そだ</rt></ruby>てるよ。
        <br />
        <ruby>育<rt>そだ</rt></ruby>てると すがたも <ruby>変<rt>か</rt></ruby>わる！
      </>
    )
  },
  {
    icon: "💪",
    title: "トレーニング",
    text: (
      <>
        ミニゲームで <ruby>強<rt>つよ</rt></ruby>くなって、
        <br />
        ランキングにも ちょうせんしよう！
      </>
    )
  },
  {
    icon: "🌱",
    title: "たね",
    text: (
      <>
        ミッションや「あいことば」で
        <br />
        たねが もらえるよ。
        <br />
        たねを <ruby>使<rt>つか</rt></ruby>うと もっと <ruby>強<rt>つよ</rt></ruby>く！
      </>
    )
  },
  {
    icon: "✨",
    title: (
      <>
        <ruby>進化<rt>しんか</rt></ruby>
      </>
    ),
    text: (
      <>
        <ruby>強<rt>つよ</rt></ruby>くすると、ボタンを <ruby>押<rt>お</rt></ruby>して
        <br />
        <ruby>進化<rt>しんか</rt></ruby>（<ruby>変身<rt>へんしん</rt></ruby>）できるよ。
      </>
    )
  },
  {
    icon: "⚔️",
    title: "バトル",
    text: (
      <>
        <ruby>全国<rt>ぜんこく</rt></ruby>の みんなや、<ruby>友<rt>とも</rt></ruby>だちと
        <br />
        <ruby>戦<rt>たたか</rt></ruby>える。<ruby>勝<rt>か</rt></ruby>つと <ruby>戦闘力<rt>せんとうりょく</rt></ruby>アップ！
      </>
    )
  },
  {
    icon: "🌅",
    title: (
      <>
        <ruby>旅立<rt>たびだ</rt></ruby>ち
      </>
    ),
    text: (
      <>
        1<ruby>か月<rt>かげつ</rt></ruby>で モンスターは <ruby>旅立<rt>たびだ</rt></ruby>ち。
        <br />
        <ruby>図鑑<rt>ずかん</rt></ruby>に <ruby>載<rt>の</rt></ruby>って、
        <br />
        <ruby>次<rt>つぎ</rt></ruby>の <ruby>卵<rt>たまご</rt></ruby>を <ruby>選<rt>えら</rt></ruby>べるよ。
      </>
    )
  },
  {
    icon: "🚀",
    title: "はじめよう！",
    text: (
      <>
        まずは「💪トレーニング」で
        <br />
        <ruby>強<rt>つよ</rt></ruby>くしよう！ がんばってね！
      </>
    )
  }
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
  const [statPop, setStatPop] = useState<{ stat: StatKey; inc: number } | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  function finishTutorial() {
    try {
      localStorage.setItem("swm_tutorial_seen", "1");
    } catch {
      // 無視
    }
    setShowTutorial(false);
  }

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
      // 管理者など子どもがいない場合の保険：管理者は管理画面へ
      const { data: prof } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();
      router.push(prof?.role === "admin" ? "/admin-sowers" : "/register-child");
      return;
    }

    setChildName(child.name);
    // クイック切り替え登録済みなら、最新トークンを保存し直す（切り替え失敗を防ぐ）
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (sess.session && isSaved(userId)) {
        updateAccountTokens(
          userId,
          sess.session.access_token,
          sess.session.refresh_token,
          child.name
        );
      }
    } catch {
      // 無視
    }

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
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!activeMonster) {
      router.push("/egg-select");
      return;
    }

    let m = activeMonster as HomeMonster;

    // 限界値は「生まれた日」から1日ごとに +1 ずつ成長する。
    // （リセット＝新しいモンスターは created_at が新しくなるので、また20からスタート）
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = new Date().toLocaleDateString("sv-SE"); // ローカル日付

    // 成長を数える起点：すでに成長を反映した日があればそれ、なければ「生まれた日」
    const fromBase = new Date(m.last_growth_date || m.created_at);
    fromBase.setHours(0, 0, 0, 0);
    const days = Math.max(
      0,
      Math.floor((today.getTime() - fromBase.getTime()) / 86400000)
    );

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
    } else if (!m.last_growth_date) {
      // 生まれた当日など：起点だけ記録（成長は0）
      await supabase
        .from("monsters")
        .update({ last_growth_date: todayStr })
        .eq("id", m.id);
      m = { ...m, last_growth_date: todayStr };
    }

    setMonster(m);

    // はじめての人には チュートリアルを 1回だけ ひらく
    try {
      if (!localStorage.getItem("swm_tutorial_seen")) {
        setTutorialStep(0);
        setShowTutorial(true);
      }
    } catch {
      // 無視
    }

    try {
      setSeeds(await getMySeeds());
    } catch {
      // 続行
    }

    const { data: topData } = await supabase
      .from("monsters")
      .select(
        "id, name, battle_power, child_id, egg_color, stage, speed, technique, children ( name )"
      )
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
        child_name: r.children?.name || "なまえ未設定",
        egg_color: r.egg_color,
        stage: r.stage,
        speed: r.speed,
        technique: r.technique
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
      setStatPop({ stat, inc });
      window.setTimeout(() => setStatPop(null), 1400);
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
@keyframes stat-flash{0%{box-shadow:0 0 0 0 rgba(255,210,60,1);filter:brightness(1.7);}40%{filter:brightness(1.3);}100%{box-shadow:0 0 0 24px rgba(255,210,60,0);filter:brightness(1);}}
.stat-flash{animation:stat-flash .85s ease-out;}
@keyframes statpop-rise{0%{transform:translate(-50%,12px) scale(.6);opacity:0;}22%{opacity:1;transform:translate(-50%,0) scale(1.12);}78%{opacity:1;}100%{transform:translate(-50%,-44px) scale(1);opacity:0;}}
.statpop{position:fixed;left:50%;top:40%;z-index:100000;pointer-events:none;font-weight:900;font-size:26px;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.45);animation:statpop-rise 1.4s ease-out forwards;text-align:center;line-height:1.3;}
ruby rt{font-size:.5em;font-weight:800;color:#6b4a2e;}
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "#fff",
              borderRadius: 14,
              padding: "5px 13px",
              boxShadow: "0 3px 0 rgba(0,0,0,0.14)"
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/tane_logo.png"
              alt="sowers たねもん"
              style={{ height: 30, display: "block" }}
            />
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
            <div
              className={`monster-stage time-${(() => {
                const h = new Date().getHours();
                return h < 5 || h >= 19 ? "night" : h >= 16 ? "evening" : "day";
              })()}`}
            >
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
                    size={STAGE_SIZE[monster.stage] ?? 128}
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
                      gridTemplateColumns: "26px 34px 1fr auto",
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

                    <div
                      style={{
                        width: 34,
                        height: 34,
                        background: "#fff1cf",
                        border: "2px solid #2b1b10",
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden"
                      }}
                    >
                      <MonsterIcon
                        color={row.egg_color}
                        size={30}
                        stage={row.stage}
                        speed={row.speed}
                        technique={row.technique}
                      />
                    </div>
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

          <button
            className="button gray"
            onClick={() => {
              setTutorialStep(0);
              setShowTutorial(true);
            }}
          >
            ❓ あそびかた を みる
          </button>

          <button
            className="button gray"
            style={{ marginTop: 8 }}
            onClick={() => router.push("/switch")}
          >
            👥 アカウント切り替え
          </button>

          <button
            className="button gray"
            style={{ marginTop: 8 }}
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
            }}
          >
            ↩ ログアウト
          </button>
        </div>
      </div>

      {/* はじめての人むけ チュートリアル */}
      {showTutorial && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 70,
            background: "rgba(18,10,28,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 22
          }}
        >
          <div
            className="card"
            style={{ width: "100%", maxWidth: 340, marginBottom: 0, textAlign: "center" }}
          >
            <div style={{ fontSize: 60, lineHeight: 1 }}>
              {SLIDES[tutorialStep].icon}
            </div>
            <div className="title" style={{ marginTop: 6 }}>
              {SLIDES[tutorialStep].title}
            </div>
            <div
              className="note"
              style={{ fontSize: 15, textAlign: "left", minHeight: 66 }}
            >
              {SLIDES[tutorialStep].text}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 6,
                margin: "12px 0"
              }}
            >
              {SLIDES.map((_, i) => (
                <span
                  key={i}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: i === tutorialStep ? "#ff7a00" : "#e0d3bd"
                  }}
                />
              ))}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              {tutorialStep > 0 && (
                <button
                  className="button gray"
                  style={{ flex: 1, marginTop: 0 }}
                  onClick={() => setTutorialStep((s) => s - 1)}
                >
                  もどる
                </button>
              )}
              {tutorialStep < SLIDES.length - 1 ? (
                <button
                  className="button"
                  style={{ flex: 1, marginTop: 0 }}
                  onClick={() => setTutorialStep((s) => s + 1)}
                >
                  つぎへ ▶
                </button>
              ) : (
                <button
                  className="button orange"
                  style={{ flex: 1, marginTop: 0 }}
                  onClick={finishTutorial}
                >
                  はじめる！
                </button>
              )}
            </div>

            <button
              onClick={finishTutorial}
              style={{
                marginTop: 10,
                background: "transparent",
                border: "none",
                color: "#8a6b4f",
                fontSize: 13,
                fontWeight: 900,
                cursor: "pointer"
              }}
            >
              スキップ
            </button>
          </div>
        </div>
      )}

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

      {statPop && (
        <div className="statpop">
          ⬆️ {({ power: "パワー", stamina: "スタミナ", speed: "スピード", technique: "テクニック" } as Record<string, string>)[statPop.stat]}アップ！
          <div style={{ fontSize: 38, color: "#ffd23c" }}>＋{statPop.inc}</div>
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
