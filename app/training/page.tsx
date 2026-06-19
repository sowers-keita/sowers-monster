"use client";

import BottomNav from "@/components/BottomNav";
import MonsterIcon from "@/components/MonsterIcon";
import CelebrationConfetti from "@/components/CelebrationConfetti";
import {
  ActiveMonster,
  GameType,
  addSeedToChild,
  getGameRanking,
  getMyActiveMonster,
  mondayStart,
  saveGameScore,
  ymdLocal
} from "@/lib/game";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";

type StatType = "power" | "stamina" | "speed" | "technique";
type TrainingType = "friend" | "running" | "stop" | "thread";

type TrainingConfig = {
  type: TrainingType;
  stat: StatType;
  title: string;
  howto: string;
  goals: string[];
  targetLabel: string;
};

const trainings: TrainingConfig[] = [
  {
    type: "friend",
    stat: "power",
    title: "連打トレーニング",
    howto: "10秒で できるだけ たくさん タップ！",
    goals: ["90回で パワー +5"],
    targetLabel: "パワー"
  },
  {
    type: "running",
    stat: "stamina",
    title: "ランニングトレーニング",
    howto: "タップで 小ジャンプ／長おしで 大ジャンプ。あなに おちないでね。",
    goals: ["100mで スタミナ +5"],
    targetLabel: "スタミナ"
  },
  {
    type: "stop",
    stat: "speed",
    title: "ストップトレーニング",
    howto: "うごくバーを みどりゾーンで ストップ！",
    goals: [
      "10れんぞくで スピード +5",
      "れんぞくが つづくかぎり 時間を こえても つづく！"
    ],
    targetLabel: "スピード"
  },
  {
    type: "thread",
    stat: "technique",
    title: "糸通しトレーニング",
    howto: "長おしで 上、はなすと 下。すき間を とおろう。1回でも ぶつかったら おしまい。",
    goals: ["20枚で テクニック +5"],
    targetLabel: "テクニック"
  }
];

// あそびかた＋もくひょう を まとめて わかりやすく見せる
function Guide({ howto, goals }: { howto: string; goals: string[] }) {
  return (
    <div
      style={{
        background: "#fff7e9",
        border: "3px solid #2b1b10",
        borderRadius: 16,
        padding: "10px 12px",
        marginTop: 8
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 900,
          color: "#2b1b10",
          lineHeight: 1.6
        }}
      >
        <span
          style={{
            background: "#34b85a",
            color: "#fff",
            borderRadius: 8,
            padding: "1px 8px",
            marginRight: 6,
            fontSize: 12
          }}
        >
          あそびかた
        </span>
        {howto}
      </div>
      <div style={{ marginTop: 8 }}>
        <span
          style={{
            background: "#ff7a00",
            color: "#fff",
            borderRadius: 8,
            padding: "1px 8px",
            fontSize: 12,
            fontWeight: 900
          }}
        >
          もくひょう
        </span>
        <ul style={{ margin: "6px 0 0", paddingLeft: 20 }}>
          {goals.map((g, i) => (
            <li
              key={i}
              style={{
                fontSize: 14,
                fontWeight: 900,
                color: "#2b1b10",
                lineHeight: 1.7
              }}
            >
              {g}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// トレーニングは1日それぞれ1回まで（localStorageで記録）
// 日付はローカル（日本時間）基準にして、日付が変わったらリセットされるようにする
function trainDoneKey(childId: string, type: string) {
  const today = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD（ローカル）
  return `swm_train_${childId}_${type}_${today}`;
}

// ④ ストップウォッチ：5秒までは見える／5秒〜は隠れる。10.0000秒ちょうどで止めると満点。種なし。
function StopwatchTraining({
  onBack,
  finish
}: {
  onBack: () => void;
  finish: (
    g: GameType,
    stats: StatType[],
    pts: number,
    score: number,
    result: string
  ) => void;
}) {
  const TARGET = 10;
  const SHOW_UNTIL = 5;
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const [best, setBest] = useState<number | null>(null);
  const [rank, setRank] = useState("");
  const [statUp, setStatUp] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function tick() {
    if (startRef.current !== null) {
      setElapsed((performance.now() - startRef.current) / 1000);
      rafRef.current = requestAnimationFrame(tick);
    }
  }
  function start() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setResult(null);
    setElapsed(0);
    setRunning(true);
    startRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  }
  function stop() {
    if (!running || startRef.current === null) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const t = (performance.now() - startRef.current) / 1000;
    setElapsed(t);
    setResult(t);
    setRunning(false);
    const d = Math.abs(t - TARGET);
    setBest((b) => (b === null || d < b ? d : b));
    // 7秒より早く止めた場合は成長なし（0）
    const pts = t < 7 ? 0 : d <= 0.05 ? 3 : d <= 0.3 ? 2 : 1;
    const score = Math.round(t * 10000); // 押した時間(0.1ms単位)。100000(=10.0000秒)に近いほど上位
    setStatUp(pts);
    finish("stopwatch", ["power", "stamina"], pts, score, `${t.toFixed(4)} 秒！`);
  }

  const hidden = running && elapsed >= SHOW_UNTIL;
  const big =
    result !== null
      ? result.toFixed(4)
      : !running
      ? "0.0000"
      : hidden
      ? "？.？？？？"
      : elapsed.toFixed(4);
  const diff = result !== null ? Math.abs(result - TARGET) : null;

  return (
    <div className="card" style={{ textAlign: "center" }}>
      <div className="title">10.0000秒 ちょうどで ストップ！</div>
      <div className="note">
        スタートを おすと カウント開始。5秒までは 見えるけど、5秒を すぎると
        タイマーが かくれるよ。10.0000秒ぴったりを ねらおう！
      </div>
      <div
        style={{
          margin: "18px 0",
          fontSize: 44,
          fontWeight: 900,
          color: hidden ? "#c9b48f" : "#2b1b10",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: 1
        }}
      >
        {big}
        <span style={{ fontSize: 18, marginLeft: 4 }}>秒</span>
      </div>
      {!running && result === null && (
        <button className="button green" onClick={start}>
          スタート
        </button>
      )}
      {running && (
        <button className="button red" onClick={stop}>
          ストップ！
        </button>
      )}
      {result !== null && diff !== null && (
        <>
          <div
            style={{
              fontSize: 16,
              fontWeight: 900,
              color: diff < 0.05 ? "#1f9d57" : "#2b1b10",
              marginBottom: 10
            }}
          >
            {diff === 0
              ? "パーフェクト！ 10.0000秒 ちょうど！"
              : `10.0000秒との さ：${diff.toFixed(4)} 秒`}
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 900,
              color: "#1f9d57",
              marginBottom: 4
            }}
          >
            のうりょく ＋{statUp}（パワー・スタミナ）
          </div>
          {rank && (
            <div style={{ fontSize: 13, color: "#7a6a55", marginBottom: 10 }}>
              {rank}
            </div>
          )}
          <button className="button green" onClick={start}>
            もう一度
          </button>
        </>
      )}
      {best !== null && (
        <div style={{ marginTop: 12, fontSize: 13, color: "#7a6a55" }}>
          ベスト（10秒との さ）：{best.toFixed(4)} 秒
        </div>
      )}
      <button className="button gray" style={{ marginTop: 12 }} onClick={onBack}>
        ← もどる
      </button>
    </div>
  );
}

// ⑤ 数字タッチ（5×4）：スタート後 1→20 を順にタッチ。毎回ランダム。タイムを競う。種なし。
function NumberTouchTraining({
  onBack,
  finish
}: {
  onBack: () => void;
  finish: (
    g: GameType,
    stats: StatType[],
    pts: number,
    score: number,
    result: string
  ) => void;
}) {
  const NN = 20;
  const makeOrder = () => {
    const a = Array.from({ length: NN }, (_, i) => i + 1);
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const [order, setOrder] = useState<number[]>(makeOrder);
  const [next, setNext] = useState(1);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [best, setBest] = useState<number | null>(null);
  const [wrong, setWrong] = useState(0);
  const [rank, setRank] = useState("");
  const [statUp, setStatUp] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function tick() {
    if (startRef.current !== null) {
      setElapsed((performance.now() - startRef.current) / 1000);
      rafRef.current = requestAnimationFrame(tick);
    }
  }
  function start() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setOrder(makeOrder());
    setNext(1);
    setDone(false);
    setWrong(0);
    setElapsed(0);
    setRunning(true);
    startRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  }
  function press(n: number) {
    if (!running || done) return;
    if (n === next) {
      if (n >= NN) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        const t = (performance.now() - (startRef.current || 0)) / 1000;
        setElapsed(t);
        setRunning(false);
        setDone(true);
        setNext(NN + 1);
        setBest((b) => (b === null || t < b ? t : b));
        const pts = t <= 12 ? 3 : t <= 18 ? 2 : 1;
        const score = Math.max(1, Math.round(20000 / t));
        setStatUp(pts);
        finish("number", ["speed", "technique"], pts, score, `${t.toFixed(2)} 秒！`);
      } else {
        setNext(n + 1);
      }
    } else {
      setWrong((w) => w + 1);
    }
  }

  return (
    <div className="card">
      <div className="title" style={{ textAlign: "center" }}>
        1から 20まで 順番にタッチ！
      </div>
      <div className="note" style={{ textAlign: "center" }}>
        スタートを おしてから、1→20を できるだけ はやく タッチ。毎回 ならびは
        バラバラだよ。
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          margin: "10px 4px 6px"
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: "#7a6a55" }}>つぎは</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#2b1b10" }}>
            {done ? "✓" : running ? next : "-"}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "#7a6a55" }}>タイム</div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 900,
              color: "#2b1b10",
              fontVariantNumeric: "tabular-nums"
            }}
          >
            {elapsed.toFixed(2)}
          </div>
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 6,
          userSelect: "none",
          WebkitUserSelect: "none",
          touchAction: "manipulation"
        }}
      >
        {order.map((n, i) => {
          const cleared = running && n < next;
          return (
            <button
              key={i}
              draggable={false}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => press(n)}
              style={{
                aspectRatio: "1 / 1",
                border: "3px solid #2b1b10",
                borderRadius: 14,
                background: cleared ? "#9fe3b0" : "#fff7e9",
                color: "#2b1b10",
                fontSize: 22,
                fontWeight: 900,
                fontVariantNumeric: "tabular-nums",
                opacity: running || done ? 1 : 0.5,
                userSelect: "none",
                WebkitUserSelect: "none",
                touchAction: "manipulation",
                cursor: "pointer"
              }}
            >
              <span style={{ pointerEvents: "none" }}>{n}</span>
            </button>
          );
        })}
      </div>
      <div
        style={{
          textAlign: "center",
          marginTop: 12,
          minHeight: 22,
          fontWeight: 900,
          color: done ? "#1f9d57" : "#7a6a55"
        }}
      >
        {done
          ? `クリア！ タイム ${elapsed.toFixed(2)} 秒` + (wrong ? `（ミス ${wrong}）` : "")
          : running
          ? "1から じゅんに タッチ！"
          : "スタートを おしてね"}
      </div>
      {done && (
        <div style={{ textAlign: "center", marginTop: 4 }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: "#1f9d57" }}>
            のうりょく ＋{statUp}（スピード・テクニック）
          </div>
          {rank && (
            <div style={{ fontSize: 13, color: "#7a6a55", marginTop: 2 }}>
              {rank}
            </div>
          )}
        </div>
      )}
      <button className="button green" style={{ marginTop: 8 }} onClick={start}>
        {done || !running ? "スタート" : "やりなおす"}
      </button>
      {best !== null && (
        <div
          style={{
            textAlign: "center",
            marginTop: 10,
            fontSize: 13,
            color: "#7a6a55"
          }}
        >
          ベスト：{best.toFixed(2)} 秒
        </div>
      )}
      <button className="button gray" style={{ marginTop: 12 }} onClick={onBack}>
        ← もどる
      </button>
    </div>
  );
}

export default function TrainingPage() {
  const router = useRouter();

  const [monster, setMonster] = useState<ActiveMonster | null>(null);
  const [selected, setSelected] = useState<TrainingType>("friend");
  const [mode, setMode] = useState<"menu" | "playing" | "clear">("menu");
  const [extra, setExtra] = useState<"stopwatch" | "number" | null>(null);
  const [earned, setEarned] = useState(0);
  const [gotSeed, setGotSeed] = useState(false);
  const [resultText, setResultText] = useState("");
  const [rankText, setRankText] = useState("");
  const [celebrateKey, setCelebrateKey] = useState(0);
  const [earnedLabel, setEarnedLabel] = useState("");
  const [lastExtra, setLastExtra] = useState<"stopwatch" | "number" | null>(null);
  const [doneToday, setDoneToday] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadMonster();
    if (typeof window !== "undefined") {
      const t = new URLSearchParams(window.location.search).get("t");
      if (t === "friend" || t === "running" || t === "stop" || t === "thread") {
        setSelected(t);
        setMode("playing");
      }
    }
  }, []);

  async function loadMonster() {
    const current = await getMyActiveMonster();

    if (!current) {
      router.push("/login");
      return;
    }

    setMonster(current);

    const d: Record<string, boolean> = {};
    for (const t of ["friend", "running", "stop", "thread"]) {
      d[t] = localStorage.getItem(trainDoneKey(current.child_id, t)) === "1";
    }
    setDoneToday(d);
  }

  const config = useMemo(() => {
    return trainings.find((item) => item.type === selected) || trainings[0];
  }, [selected]);

  // statPoints: 能力の現在値を上げる（以前どおり、上限まで）。
  // seedEarned: 条件達成なら「種」を1つもらえる（1日それぞれ1回）。
  async function onClear(
    statPoints: number,
    seedEarned: boolean,
    result?: string,
    score?: number
  ) {
    if (!monster) {
      return;
    }

    // ミニゲームの今週のベストスコアを保存し、今週の順位を出す
    let rank = "";
    let topTen = false;
    if (score && score > 0) {
      try {
        await saveGameScore(monster.child_id, config.type, score);
        const ws = ymdLocal(mondayStart());
        const ranking = await getGameRanking(config.type, ws, 500);
        const idx = ranking.findIndex((r) => r.child_id === monster.child_id);
        if (idx >= 0) {
          rank = `今週のランキング ${idx + 1}位 / ${ranking.length}人中`;
          topTen = idx < 10;
        }
      } catch {
        // 失敗しても続行
      }
    }
    setRankText(rank);
    if (topTen) setCelebrateKey(Date.now()); // トップ10入りでお祝い

    // 能力値（現在値）を上げる
    if (statPoints > 0) {
      const update: Partial<ActiveMonster> = {};
      if (config.stat === "power") {
        update.power = Math.min(monster.power + statPoints, monster.power_max);
      }
      if (config.stat === "stamina") {
        update.stamina = Math.min(
          monster.stamina + statPoints,
          monster.stamina_max
        );
      }
      if (config.stat === "speed") {
        update.speed = Math.min(monster.speed + statPoints, monster.speed_max);
      }
      if (config.stat === "technique") {
        update.technique = Math.min(
          monster.technique + statPoints,
          monster.technique_max
        );
      }

      const { error } = await supabase
        .from("monsters")
        .update(update)
        .eq("id", monster.id);

      if (error) {
        alert(error.message);
        return;
      }

      setMonster({ ...monster, ...update } as ActiveMonster);
    }

    // 種の配布は停止しました（種は実際の練習レビューの「あいことば」からのみ）。
    const seed = false;
    void seedEarned;

    setEarned(statPoints);
    setGotSeed(seed);
    setResultText(result || "");
    setEarnedLabel(config.targetLabel);
    setLastExtra(null);
    setMode("clear");
  }

  // 追加トレーニング（ストップウォッチ・数字タッチ）の共通仕上げ：
  // ランキング保存＋順位算出、能力（複数）を上げる。種は配布しない。
  // 追加トレーニング（ストップウォッチ・数字タッチ）の仕上げ：
  // 他のトレーニングと同じ共通クリア画面へ遷移し、ランキング順位を反映する。
  async function finishExtra(
    gameType: GameType,
    stats: StatType[],
    statPoints: number,
    score: number,
    result: string
  ): Promise<void> {
    if (!monster) return;

    // 先に共通クリア画面へ切り替え（他のトレーニングと同じ見た目）
    const label =
      stats.includes("power") && stats.includes("stamina")
        ? "パワー・スタミナ"
        : stats.includes("speed") && stats.includes("technique")
        ? "スピード・テクニック"
        : "のうりょく";
    setEarned(statPoints);
    setGotSeed(false);
    setResultText(result);
    setRankText("");
    setEarnedLabel(label);
    setLastExtra(gameType === "stopwatch" ? "stopwatch" : "number");
    setExtra(null);
    setMode("clear");

    // ランキング保存＋順位算出（あとから反映）
    let topTen = false;
    if (score > 0) {
      try {
        await saveGameScore(monster.child_id, gameType, score);
        const ws = ymdLocal(mondayStart());
        const ranking = await getGameRanking(gameType, ws, 500);
        const idx = ranking.findIndex((r) => r.child_id === monster.child_id);
        if (idx >= 0) {
          setRankText(`今週のランキング ${idx + 1}位 / ${ranking.length}人中`);
          topTen = idx < 10;
        }
      } catch {
        // 続行
      }
    }
    if (topTen) setCelebrateKey(Date.now()); // トップ10入りでお祝い

    // 能力を上げる
    if (statPoints > 0) {
      const update: Partial<ActiveMonster> = {};
      for (const st of stats) {
        if (st === "power")
          update.power = Math.min(monster.power + statPoints, monster.power_max);
        if (st === "stamina")
          update.stamina = Math.min(
            monster.stamina + statPoints,
            monster.stamina_max
          );
        if (st === "speed")
          update.speed = Math.min(monster.speed + statPoints, monster.speed_max);
        if (st === "technique")
          update.technique = Math.min(
            monster.technique + statPoints,
            monster.technique_max
          );
      }
      const { error } = await supabase
        .from("monsters")
        .update(update)
        .eq("id", monster.id);
      if (!error) setMonster({ ...monster, ...update } as ActiveMonster);
    }
  }

  if (!monster) {
    return (
      <main className="page">
        <div className="phone">
          <div className="header">トレーニング</div>
          <div className="content">
            <div className="card">
              <div className="title">読み込み中…</div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <CelebrationConfetti fireKey={celebrateKey} />
      <div className="phone">
        <div className="header">トレーニング</div>

        <div className="content" style={{ paddingBottom: 92 }}>
          {mode === "menu" && extra === null && (
            <>
              <div className="card" style={{ textAlign: "center" }}>
                <MonsterIcon
                  color={monster.egg_color}
                  size={120}
                  stage={monster.stage}
                  speed={monster.speed}
                  technique={monster.technique}
                />
                <div className="title" style={{ marginTop: 10 }}>
                  どのトレーニングをする？
                </div>
                <div className="note">
                  がんばるほど のうりょくUP！自己ベストを めざそう。
                </div>
              </div>

              {trainings.map((item) => (
                <button
                  key={item.type}
                  className="button orange"
                  onClick={() => {
                    setSelected(item.type);
                    setMode("playing");
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1.2
                  }}
                >
                  <span>{item.title}</span>
                </button>
              ))}

              <button
                className="button orange"
                onClick={() => setExtra("stopwatch")}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1.2 }}
              >
                <span>ストップウォッチ</span>
              </button>

              <button
                className="button orange"
                onClick={() => setExtra("number")}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1.2 }}
              >
                <span>数字タッチ（5×4）</span>
              </button>
            </>
          )}

          {mode === "playing" && selected === "friend" && (
            <TapTraining config={config} onClear={onClear} />
          )}

          {mode === "playing" && selected === "running" && (
            <RunningTraining config={config} onClear={onClear} monster={monster} />
          )}

          {mode === "playing" && selected === "stop" && (
            <PowerTraining config={config} onClear={onClear} />
          )}

          {mode === "playing" && selected === "thread" && (
            <ThreadTraining config={config} onClear={onClear} />
          )}

          {extra === "stopwatch" && (
            <StopwatchTraining onBack={() => setExtra(null)} finish={finishExtra} />
          )}

          {extra === "number" && (
            <NumberTouchTraining onBack={() => setExtra(null)} finish={finishExtra} />
          )}

          {mode === "clear" && (
            <div className="card" style={{ textAlign: "center" }}>
              <MonsterIcon
                color={monster.egg_color}
                size={120}
                stage={monster.stage}
                speed={monster.speed}
                technique={monster.technique}
                happy={earned > 0 || gotSeed}
                expression={earned > 0 || gotSeed ? "happy" : "sad"}
              />

              {resultText && (
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 28,
                    fontWeight: 900,
                    color: "#2b1b10"
                  }}
                >
                  {resultText}
                </div>
              )}

              {rankText && (
                <div
                  style={{
                    margin: "8px auto 0",
                    display: "inline-block",
                    background: "#fff1cf",
                    border: "3px solid #2b1b10",
                    borderRadius: 999,
                    padding: "6px 16px",
                    fontSize: 16,
                    fontWeight: 900,
                    color: "#2b1b10"
                  }}
                >
                  🏅 {rankText}
                </div>
              )}

              {earned > 0 ? (
                <div className="title" style={{ color: "#2f8ee5" }}>
                  {earnedLabel} +{earned}！
                </div>
              ) : (
                <div className="title">ざんねん…</div>
              )}

              {gotSeed && (
                <div className="title" style={{ color: "#ff7a00", marginTop: 4 }}>
                  🌱 {config.targetLabel}の種 を 1こ ゲット！
                </div>
              )}

              <div className="note">
                {gotSeed
                  ? "もちもの から 種を つかうと 限界値が あがるよ！"
                  : earned > 0
                  ? `${earnedLabel}が ふえたよ。`
                  : "また ちょうせんしてね！"}
              </div>

              <button
                className="button"
                onClick={() => {
                  if (lastExtra) {
                    setExtra(lastExtra);
                    setMode("menu");
                  } else {
                    setMode("playing");
                  }
                }}
              >
                🔁 もう一度
              </button>

              <button
                className="button orange"
                onClick={() => router.push("/home")}
              >
                ホームへ戻る
              </button>

              <button
                className="button gray"
                onClick={() => {
                  setExtra(null);
                  setLastExtra(null);
                  setMode("menu");
                }}
              >
                メニューへ
              </button>
            </div>
          )}
        </div>
      </div>

      <BottomNav active="training" />
    </main>
  );
}

// ① ストップ：10秒チャレンジ。成功回数で +1/+2/+3。成功ごとに加速。
function PowerTraining({
  config,
  onClear
}: {
  config: TrainingConfig;
  onClear: (
    statPoints: number,
    seedEarned: boolean,
    result?: string,
    score?: number
  ) => void;
}) {
  const [position, setPosition] = useState(0);
  const posRef = useRef(0);
  const dirRef = useRef(1);
  const speedRef = useRef(2.4);
  const successRef = useRef(0); // 連続成功（リセットあり）
  const maxStreakRef = useRef(0); // 最高連続記録（結果表示用）
  const totalRef = useRef(0); // 合計成功（能力アップ用）
  const seedReachedRef = useRef(false); // 10連続で種ゲット（その後も続く）
  const firedRef = useRef(false);
  const timeUpRef = useRef(false); // 時間切れフラグ（連続が続く限りは終わらない）

  const [success, setSuccess] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [message, setMessage] = useState("ストップでスタート！");
  const [fx, setFx] = useState<{ id: number; x: number; rainbow?: boolean }[]>(
    []
  );
  const fxId = useRef(0);

  // 終了処理（最高連続記録で 配点。10連続=5点）
  function finishGame() {
    if (firedRef.current) {
      return;
    }
    firedRef.current = true;
    setFinished(true);
    const ms = maxStreakRef.current;
    const pts =
      ms >= 10 ? 5 : ms >= 8 ? 4 : ms >= 6 ? 3 : ms >= 3 ? 2 : ms >= 1 ? 1 : 0;
    onClear(pts, seedReachedRef.current, `さいこう ${ms} 連続！`, ms);
  }

  // バーの動き（常に動く）
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (finished) {
        return;
      }

      let next = posRef.current + dirRef.current * speedRef.current;

      if (next >= 100) {
        next = 100;
        dirRef.current = -1;
      }

      if (next <= 0) {
        next = 0;
        dirRef.current = 1;
      }

      posRef.current = next;
      setPosition(next);
    }, 30);

    return () => window.clearInterval(timer);
  }, [finished]);

  // 10秒カウントダウン
  useEffect(() => {
    if (!started || finished) {
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        const next = Number((prev - 0.1).toFixed(1));

        if (next <= 0) {
          window.clearInterval(timer);
          timeUpRef.current = true;
          // 連続が続いていなければ終了。続いているうちは ミスするまで終わらない！
          if (successRef.current <= 0) {
            finishGame();
          } else {
            setMessage("じかんアップ！ れんぞくが つづくかぎり まだ いける！");
          }
          return 0;
        }

        return next;
      });
    }, 100);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, finished]);

  function stop() {
    if (finished) {
      return;
    }

    if (!started) {
      setStarted(true);
    }

    const pos = posRef.current;

    if (pos >= 38 && pos <= 62) {
      successRef.current += 1;
      totalRef.current += 1;
      maxStreakRef.current = Math.max(maxStreakRef.current, successRef.current);
      setSuccess(successRef.current);
      speedRef.current += 0.4;

      const reached = successRef.current >= 10;

      // 成功エフェクト（10連続は虹色）
      const id = fxId.current++;
      setFx((f) => [...f, { id, x: pos, rainbow: reached }]);
      window.setTimeout(() => setFx((f) => f.filter((e) => e.id !== id)), 650);

      if (reached && !seedReachedRef.current) {
        seedReachedRef.current = true;
        setMessage("10れんぞく！ スピードの種 ゲット！ まだ つづく！");
      } else if (reached) {
        setMessage(`${successRef.current}れんぞく！（種ゲット済み）`);
      } else {
        setMessage(`${successRef.current}れんぞく！`);
      }
    } else {
      successRef.current = 0;
      setSuccess(0);
      // 時間切れのあとで れんぞくが きれたら、ここで終了
      if (timeUpRef.current) {
        setMessage("れんぞく しゅうりょう！");
        finishGame();
      } else {
        setMessage("れんぞく リセット…");
      }
    }
  }

  return (
    <div className="card">
      <EffectStyles />
      <div className="title">{config.title}</div>
      <Guide howto={config.howto} goals={config.goals} />

      <div
        style={{
          height: 80,
          border: "4px solid #2b1b10",
          borderRadius: 999,
          position: "relative",
          marginTop: 20,
          background: "#ffe0a6",
          overflow: "visible"
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "38%",
            width: "24%",
            height: "100%",
            background: "#7cff8a",
            borderLeft: "4px dashed #2b1b10",
            borderRight: "4px dashed #2b1b10",
            borderRadius: 4
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `${position}%`,
            top: 8,
            width: 34,
            height: 56,
            transform: "translateX(-50%)",
            background: "#ff4b35",
            border: "4px solid #2b1b10",
            borderRadius: 14
          }}
        />

        {/* 成功エフェクト */}
        {fx.map((e) => (
          <div
            key={e.id}
            style={{
              position: "absolute",
              left: `${e.x}%`,
              top: "50%",
              pointerEvents: "none"
            }}
          >
            <span
              className="fx-ring"
              style={{ borderColor: e.rainbow ? "#ffd23f" : "#fff" }}
            />
            <span
              className="fx-ring"
              style={{
                animationDelay: "0.1s",
                borderColor: e.rainbow ? "#18a0fb" : "#ffd23f"
              }}
            />
            <SparkBurst tier={e.rainbow ? 9 : 4} />
          </div>
        ))}
      </div>

      <div className="title" style={{ marginTop: 16 }}>
        {message}
      </div>

      <div className="note">
        のこり {timeLeft.toFixed(1)} 秒 ・ れんぞく {success} / 10
      </div>

      <button className="button red" onClick={stop}>
        {started ? "ストップ！" : "スタート（ストップ！）"}
      </button>
    </div>
  );
}

// ② 糸通し：横スクロールする壁のすき間を通る。1回ぶつかったら終了。通過数で +1/+2/+3。
type Wall = {
  id: number;
  x: number;
  gap: number;
  passed: boolean;
};

function ThreadTraining({
  config,
  onClear
}: {
  config: TrainingConfig;
  onClear: (
    statPoints: number,
    seedEarned: boolean,
    result?: string,
    score?: number
  ) => void;
}) {
  const [, setTick] = useState(0);
  const [passedView, setPassedView] = useState(0);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [message, setMessage] = useState("長押しで上昇、はなすと下降！");

  const state = useRef({
    y: 50,
    pressing: false,
    walls: [] as Wall[],
    passed: 0,
    nextId: 1,
    spawn: 0,
    started: false,
    finished: false,
    seedReached: false // 20こ通過で種ゲット（ゲームは続く）
  });

  const BIRD_X = 18;
  // すき間の半分。赤の壁（20枚）以降はほんの少しだけ狭くする。
  // 30枚以降も同じ広さを保ち、ずっと続けられるようにする。
  const halfGapFor = (passed: number) => (passed >= 20 ? 24 : 27);
  const WALL_HALF = 7;

  useEffect(() => {
    const timer = window.setInterval(() => {
      const s = state.current;

      if (!s.started || s.finished) {
        return;
      }

      // 速さ（5枚目までは0.7倍速、20枚から1.25倍、30枚から1.4倍）
      const sf =
        s.passed < 5
          ? 0.7
          : s.passed < 20
          ? 1.0
          : s.passed < 30
          ? 1.25
          : 1.4;

      // 鳥の上下（速さに合わせて鳥もキビキビ動く＝速くても操作できる）
      s.y += (s.pressing ? -2.4 : 2.4) * sf;
      if (s.y < 5) s.y = 5;
      if (s.y > 95) s.y = 95;

      // 壁を左へ
      for (const w of s.walls) {
        w.x -= 1.7 * sf;
      }

      // 壁の出現
      s.spawn += 1;
      const last = s.walls[s.walls.length - 1];
      if (!last || last.x < 58) {
        if (s.spawn > 12) {
          s.spawn = 0;
          s.walls.push({
            id: s.nextId++,
            x: 104,
            gap: 24 + Math.random() * 52,
            passed: false
          });
        }
      }

      // 通過判定＆衝突判定
      let hit = false;
      for (const w of s.walls) {
        if (!w.passed && w.x < BIRD_X - WALL_HALF) {
          w.passed = true;
          s.passed += 1;
        }

        if (w.x < BIRD_X + WALL_HALF && w.x > BIRD_X - WALL_HALF) {
          const hg = halfGapFor(s.passed);
          if (s.y < w.gap - hg || s.y > w.gap + hg) {
            hit = true;
          }
        }
      }

      // 画面外の壁を削除
      s.walls = s.walls.filter((w) => w.x > -16);

      setPassedView(s.passed);

      // 30こ通過で 種ゲット（まだ つづく！）
      if (s.passed >= 30 && !s.seedReached) {
        s.seedReached = true;
        setMessage("30こ クリア！ テクニックの種 ゲット！ まだ つづく！");
      }

      if (hit) {
        s.finished = true;
        setFinished(true);
        const pts =
          s.passed >= 20 ? 5 : s.passed >= 12 ? 4 : s.passed >= 7 ? 3 : s.passed >= 3 ? 2 : 1;
        setMessage(
          `ぶつかった！ ${s.passed}こ 通過（テクニック +${pts}）${
            s.seedReached ? "・種ゲット！" : ""
          }`
        );
        onClear(pts, s.seedReached, `${s.passed} 枚 通過！`, s.passed);
        return;
      }

      setTick((t) => t + 1);
    }, 30);

    return () => window.clearInterval(timer);
  }, [onClear]);

  function start() {
    if (state.current.started) {
      return;
    }
    state.current.started = true;
    setStarted(true);
    setMessage("すき間を通ろう！");
  }

  function press(on: boolean) {
    state.current.pressing = on;
  }

  const s = state.current;
  const curHalfGap = halfGapFor(s.passed);
  // 10枚から黄、20枚から赤、30枚から虹色（それまでは青）
  const wallColor =
    s.passed >= 30
      ? "linear-gradient(180deg,#ff3b3b,#ffb000,#39d353,#18a0fb,#a83dff)"
      : s.passed >= 20
      ? "#ff4b35"
      : s.passed >= 10
      ? "#f5c518"
      : "#2f8ee5";

  return (
    <div className="card">
      <div className="title">{config.title}</div>
      <Guide howto={config.howto} goals={config.goals} />

      <div
        style={{
          height: 300,
          border: "4px solid #2b1b10",
          borderRadius: 24,
          marginTop: 16,
          background: "linear-gradient(#dff3ff, #f7fbff)",
          position: "relative",
          overflow: "hidden"
        }}
      >
        {s.walls.map((w) => (
          <div key={w.id}>
            <div
              style={{
                position: "absolute",
                left: `${w.x}%`,
                top: 0,
                transform: "translateX(-50%)",
                width: `${WALL_HALF * 2}%`,
                height: `${Math.max(0, w.gap - curHalfGap)}%`,
                background: wallColor,
                border: "3px solid #2b1b10"
              }}
            />
            <div
              style={{
                position: "absolute",
                left: `${w.x}%`,
                top: `${w.gap + curHalfGap}%`,
                transform: "translateX(-50%)",
                width: `${WALL_HALF * 2}%`,
                height: `${Math.max(0, 100 - (w.gap + curHalfGap))}%`,
                background: wallColor,
                border: "3px solid #2b1b10"
              }}
            />
          </div>
        ))}

        <div
          style={{
            position: "absolute",
            left: `${BIRD_X}%`,
            top: `${s.y}%`,
            transform: "translate(-50%, -50%)",
            width: 40,
            height: 28,
            background: "#ff7a00",
            border: "4px solid #2b1b10",
            borderRadius: 999
          }}
        />
      </div>

      <div className="title" style={{ marginTop: 16 }}>
        {message}
      </div>
      <div className="note">通過：{passedView} 枚</div>

      {!started && !finished && (
        <button className="button blue" onClick={start}>
          スタート
        </button>
      )}

      {started && !finished && (
        <button
          className="button blue"
          onMouseDown={() => press(true)}
          onMouseUp={() => press(false)}
          onMouseLeave={() => press(false)}
          onTouchStart={(event) => {
            event.preventDefault();
            press(true);
          }}
          onTouchEnd={(event) => {
            event.preventDefault();
            press(false);
          }}
        >
          長押しで上昇
        </button>
      )}
    </div>
  );
}

// ③ 連打：10秒。回数で +1/+2/+3。
// ===== 火花・リングのエフェクト =====
function EffectStyles() {
  return (
    <style>{`
.fx-spark{position:absolute;left:0;top:0;width:12px;height:12px;border-radius:50%;transform:translate(-50%,-50%);animation:fx-fly .6s ease-out forwards;}
@keyframes fx-fly{0%{transform:translate(-50%,-50%) scale(1);opacity:1;}100%{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(.2);opacity:0;}}
.fx-ring{position:absolute;left:0;top:0;border-radius:50%;border:5px solid #fff;transform:translate(-50%,-50%);animation:fx-ring .5s ease-out forwards;}
@keyframes fx-ring{0%{opacity:.95;width:12px;height:12px;}100%{opacity:0;width:96px;height:96px;}}
`}</style>
  );
}

// 10回ごとにレベルアップ。80回以上(レベル8)は虹色、90回以上(レベル9)は特大虹色。
function tapTier(count: number) {
  return Math.min(9, Math.floor(count / 10));
}

const TIER_COLORS = [
  "#ffd23f",
  "#ffb000",
  "#ff9100",
  "#ff7a35",
  "#ff4b35",
  "#ff2e88",
  "#c061ff",
  "#7a5cff",
  "",
  ""
];

function SparkBurst({ tier }: { tier: number }) {
  const counts = [5, 6, 7, 8, 9, 11, 13, 15, 18, 26];
  const rainbow = tier >= 8;
  const giant = tier >= 9;
  const n = counts[Math.min(tier, counts.length - 1)];
  const baseDist = 26 + Math.min(tier, 7) * 9;
  const dist = giant ? baseDist * 2.4 : baseDist;
  const sz = giant ? 30 : 12;
  return (
    <>
      {Array.from({ length: n }).map((_, i) => {
        const ang = (360 / n) * i + tier * 9;
        const dx = Math.cos((ang * Math.PI) / 180) * dist;
        const dy = Math.sin((ang * Math.PI) / 180) * dist;
        const color = rainbow
          ? `hsl(${Math.round((360 / n) * i)},90%,55%)`
          : TIER_COLORS[tier];
        const st = {
          "--dx": `${dx.toFixed(1)}px`,
          "--dy": `${dy.toFixed(1)}px`,
          width: sz,
          height: sz,
          background: color,
          boxShadow: `0 0 ${giant ? 16 : 7}px ${color}`
        } as CSSProperties;
        return <span key={i} className="fx-spark" style={st} />;
      })}
    </>
  );
}

function TapTraining({
  config,
  onClear
}: {
  config: TrainingConfig;
  onClear: (
    statPoints: number,
    seedEarned: boolean,
    result?: string,
    score?: number
  ) => void;
}) {
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [count, setCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [bursts, setBursts] = useState<{ id: number; tier: number }[]>([]);
  const countRef = useRef(0);
  const burstId = useRef(0);
  const firedRef = useRef(false);

  const tier = tapTier(count);
  const tierColor = tier >= 8 ? "#ff4bd2" : TIER_COLORS[tier];

  useEffect(() => {
    if (!started || finished) {
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        const next = Number((prev - 0.1).toFixed(1));

        if (next <= 0) {
          window.clearInterval(timer);
          setFinished(true);

          if (!firedRef.current) {
            firedRef.current = true;
            const c = countRef.current;
            const pts =
              c >= 90 ? 5 : c >= 70 ? 4 : c >= 50 ? 3 : c >= 30 ? 2 : 1;
            onClear(pts, c >= 80, `連打 ${c} 回！`, c);
          }

          return 0;
        }

        return next;
      });
    }, 100);

    return () => window.clearInterval(timer);
  }, [started, finished, onClear]);

  function tap() {
    if (finished) {
      return;
    }

    if (!started) {
      setStarted(true);
    }

    countRef.current += 1;
    setCount(countRef.current);

    const t = tapTier(countRef.current);
    const id = burstId.current++;
    setBursts((b) => [...b, { id, tier: t }]);
    window.setTimeout(
      () => setBursts((b) => b.filter((x) => x.id !== id)),
      600
    );
  }

  return (
    <div className="card">
      <EffectStyles />
      <div className="title">{config.title}</div>
      <Guide howto={config.howto} goals={config.goals} />

      <div
        style={{
          position: "relative",
          height: 200,
          border: "4px solid #2b1b10",
          borderRadius: 24,
          marginTop: 16,
          background: "linear-gradient(#ffecec, #fffafa)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          overflow: "hidden"
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 900, color: "#ff3d3d" }}>
          {timeLeft.toFixed(1)}
        </div>
        <div style={{ fontSize: 26, fontWeight: 900, color: tierColor }}>
          連打：{count} 回
        </div>

        {/* 火花エフェクト（中央から出る） */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "52%",
            pointerEvents: "none"
          }}
        >
          {bursts.map((b) => (
            <SparkBurst key={b.id} tier={b.tier} />
          ))}
        </div>
      </div>


      <button className="button red" onClick={tap}>
        {started ? "連打！" : "スタート（タップ！）"}
      </button>
    </div>
  );
}

// ④ ランニング（スタミナ）：マリオ風の横スクロール・プラットフォーマー。
//    自動で右に進む。タップで小ジャンプ、長押しで大ジャンプ。
//    崖に落ちる or 段差に引っかかって画面外に出ると終了。進んだメートルで判定。
//    10m以下→+1 / 11〜30m→+2 / 31m以上→+3。5mごとにスピード1.25倍。
const PX_PER_M = 44; // 1メートルの表示ピクセル
const SPEED_MPS = 1.3; // 進む速さ（少し速め）
const STAGE_H = 220; // ステージ高さ
const BASE_H = 46; // レベル0の地面の高さ（px）
const LEVEL_STEP = 34; // 1段の高さ（px）
const CHAR_BASE_X = 70; // キャラの基準画面X
const CHAR_SIZE = 38;
const GRAVITY = 600; // 重力 px/s^2
const JUMP_VMAX = 360; // 大ジャンプ初速（最高到達 ≒ 108px、滞空 ≒ 1.2秒）
const JUMP_CUT = 0.42; // 早く離したときの減速率（小ジャンプ）
const STEP_TOL = 8; // これ以下の段差はそのまま登れる
const CATCHUP = 4; // 障害物を越えたあと画面中央へ戻る速さ（m/s）
const GAP = -999; // 崖（穴）のセンチネル

// コース生成：平地・登り・下り・崖をランダムに並べる。最初の4mは安全。
// 崖を多めに出す。崖の後は必ず短い足場を置いて連続落下を防ぐ。
function genCourse(): number[] {
  const h: number[] = [];
  for (let i = 0; i < 4; i++) h.push(BASE_H);
  let level = 0;
  while (h.length < 320) {
    const r = Math.random();
    if (r < 0.42) {
      // 崖（1マス）→ 同じ高さに着地して1〜2マスの足場
      h.push(GAP);
      const len = 1 + Math.floor(Math.random() * 2);
      for (let k = 0; k < len; k++) h.push(BASE_H + level * LEVEL_STEP);
    } else if (r < 0.58 && level < 2) {
      // 登り
      level += 1;
      const len = 1 + Math.floor(Math.random() * 2);
      for (let k = 0; k < len; k++) h.push(BASE_H + level * LEVEL_STEP);
    } else if (r < 0.74 && level > 0) {
      // 下り
      level -= 1;
      const len = 1 + Math.floor(Math.random() * 2);
      for (let k = 0; k < len; k++) h.push(BASE_H + level * LEVEL_STEP);
    } else {
      // 平地（短め）
      const len = 1 + Math.floor(Math.random() * 2);
      for (let k = 0; k < len; k++) h.push(BASE_H + level * LEVEL_STEP);
    }
  }
  return h;
}

function RunningTraining({
  config,
  onClear,
  monster
}: {
  config: TrainingConfig;
  onClear: (
    statPoints: number,
    seedEarned: boolean,
    result?: string,
    score?: number
  ) => void;
  monster: ActiveMonster;
}) {
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [distanceView, setDistanceView] = useState(0);
  const [, setTick] = useState(0);
  const [message, setMessage] = useState("タップでジャンプ！崖に落ちないでね");

  const firedRef = useRef(false);

  // コースをマウント時に生成
  const courseRef = useRef<number[]>([]);
  if (courseRef.current.length === 0) {
    courseRef.current = genCourse();
  }
  const heightAt = (cell: number) => {
    const c = courseRef.current;
    if (cell < 0 || cell >= c.length) return BASE_H;
    return c[cell];
  };
  const isGap = (cell: number) => heightAt(cell) === GAP;

  const g = useRef({
    camX: 0, // カメラ（コース）の進行（m）
    charX: 0, // キャラのワールド位置（m）
    yFeet: BASE_H, // 足の高さ（px）
    vy: 0,
    onGround: true,
    started: false,
    finished: false,
    seedReached: false // 100m通過で種ゲット（ゲームは続く）
  });

  useEffect(() => {
    const DT = 0.03; // 30msごと（＝1秒に1メートル）
    const timer = window.setInterval(() => {
      const s = g.current;

      if (!s.started || s.finished) {
        return;
      }

      // 5mごとにスピードが1.25倍ずつ速くなる（上限あり：100mゴールまで遊べるように）
      const sp =
        SPEED_MPS * Math.min(Math.pow(1.25, Math.floor(s.charX / 5)), 3.8);

      // カメラが進む
      s.camX += sp * DT;

      // 前方の段差で前進がブロックされるか判定
      const curCell = Math.floor(s.charX);
      const nextCell = curCell + 1;
      const frac = s.charX - curCell;
      const nextGap = isGap(nextCell);
      const nextH = nextGap ? -1 : heightAt(nextCell);
      let blocked = false;
      if (!nextGap && nextH - s.yFeet > STEP_TOL && frac > 0.45) {
        blocked = true;
      }
      if (!blocked) {
        s.charX += sp * DT;
        // 障害物を越えたあとは画面中央（camX）へ追いつく
        if (s.charX < s.camX) {
          s.charX = Math.min(s.camX, s.charX + CATCHUP * DT);
        }
      }

      // 立っているセル
      const standCell = Math.floor(s.charX + 0.001);
      const standGap = isGap(standCell);
      const groundH = standGap ? -1 : heightAt(standCell);

      // 段差を降りる / 崖に出る → 落下開始
      if (s.onGround) {
        if (standGap) {
          s.onGround = false;
          s.vy = 0;
        } else if (groundH < s.yFeet - 2) {
          s.onGround = false;
          s.vy = 0;
        } else {
          s.yFeet = groundH; // 同じ高さに吸着
        }
      }

      // 空中の物理
      if (!s.onGround) {
        s.vy -= GRAVITY * DT;
        s.yFeet += s.vy * DT;

        if (s.vy <= 0 && !standGap && s.yFeet <= groundH) {
          s.yFeet = groundH;
          s.vy = 0;
          s.onGround = true;
        }
      }

      // 画面上のキャラ位置（px）
      const screenX = CHAR_BASE_X + (s.charX - s.camX) * PX_PER_M;

      // 100メートル通過 → 種ゲット（ゲームは まだ続く！）
      if (s.charX >= 100 && !s.seedReached) {
        s.seedReached = true;
        setMessage("100m！ スタミナの種 ゲット！ まだ走れる！");
      }

      // 終了判定：崖に落ちた／引っかかって画面外／とても遠く(300m)まで走った
      if (s.yFeet < -60 || screenX < 2 || s.charX >= 300) {
        s.finished = true;
        setFinished(true);
        const meters = Math.max(0, Math.floor(s.charX));
        const pts =
          meters >= 100 ? 5 : meters >= 60 ? 4 : meters >= 30 ? 3 : meters >= 10 ? 2 : 1;
        setMessage(
          `${meters}メートル！ スタミナ +${pts}${
            s.seedReached ? "・種ゲット！" : "（ゴールは100m）"
          }`
        );
        if (!firedRef.current) {
          firedRef.current = true;
          onClear(pts, s.seedReached, `${meters} メートル！`, meters);
        }
        return;
      }

      setDistanceView(s.charX);
      setTick((t) => t + 1);
    }, 30);

    return () => window.clearInterval(timer);
  }, [onClear]);

  function start() {
    if (g.current.started) {
      return;
    }
    g.current.started = true;
    setStarted(true);
    setMessage("タップで小ジャンプ／長押しで大ジャンプ！");
  }

  function pressJump() {
    const s = g.current;
    if (!s.started) {
      start();
    }
    if (s.finished) {
      return;
    }
    if (s.onGround) {
      s.vy = JUMP_VMAX;
      s.onGround = false;
    }
  }

  function releaseJump() {
    const s = g.current;
    if (s.vy > 0) {
      s.vy *= JUMP_CUT; // 早く離すと小さいジャンプ
    }
  }

  const s = g.current;
  const meters = Math.max(0, Math.floor(distanceView));
  const screenXChar = CHAR_BASE_X + (s.charX - s.camX) * PX_PER_M;

  // ステージ：50m〜荒野、100m〜地獄、200m〜宇宙
  const stageIdx = meters < 50 ? 0 : meters < 100 ? 1 : meters < 200 ? 2 : 3;
  const stageBg = [
    "linear-gradient(#aee4ff 0%, #c8efff 45%, #8ed861 45%, #74c948 100%)",
    "linear-gradient(#d9b97a 0%, #ecd49a 45%, #b88a4a 45%, #9c6f38 100%)",
    "linear-gradient(#2a0808 0%, #7a1810 42%, #d23a16 42%, #ff7a2a 100%)",
    "radial-gradient(circle at 30% 20%, #221a5e 0%, #0a0620 60%, #05030f 100%)"
  ][stageIdx];
  const groundColor = ["#7a4a25", "#a06a32", "#3a1008", "#241f4a"][stageIdx];
  const grassColor = ["#59b13a", "#cfa85c", "#ff7a35", "#7a6cff"][stageIdx];
  const stageName = ["草原", "荒野", "地獄", "宇宙"][stageIdx];

  // 表示するセルの範囲
  const cells: number[] = [];
  for (let c = Math.floor(s.camX) - 2; c <= Math.floor(s.camX) + 10; c++) {
    if (c >= 0) {
      cells.push(c);
    }
  }

  return (
    <div className="card">
      <div className="title">{config.title}</div>
      <Guide howto={config.howto} goals={config.goals} />

      <div
        onMouseDown={pressJump}
        onMouseUp={releaseJump}
        onMouseLeave={releaseJump}
        onTouchStart={(event) => {
          event.preventDefault();
          pressJump();
        }}
        onTouchEnd={(event) => {
          event.preventDefault();
          releaseJump();
        }}
        style={{
          height: STAGE_H,
          border: "4px solid #2b1b10",
          borderRadius: 24,
          marginTop: 16,
          position: "relative",
          overflow: "hidden",
          cursor: "pointer",
          userSelect: "none",
          background: stageBg
        }}
      >
        {/* 雲（草原・荒野のみ） */}
        {stageIdx < 2 && (
          <>
            <div
              style={{
                position: "absolute",
                top: 16,
                left: 36,
                width: 60,
                height: 22,
                background: "rgba(255,255,255,0.85)",
                borderRadius: 999
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 32,
                right: 48,
                width: 80,
                height: 24,
                background: "rgba(255,255,255,0.8)",
                borderRadius: 999
              }}
            />
          </>
        )}

        {/* 地面ブロック（崖は描かない・段差は高さで表現） */}
        {cells.map((cell) =>
          isGap(cell) ? null : (
            <div
              key={cell}
              style={{
                position: "absolute",
                bottom: 0,
                left: CHAR_BASE_X + (cell - s.camX) * PX_PER_M,
                width: PX_PER_M + 1,
                height: heightAt(cell),
                background: groundColor,
                borderTop: `6px solid ${grassColor}`,
                boxSizing: "border-box"
              }}
            />
          )
        )}

        {/* キャラクター */}
        <div
          style={{
            position: "absolute",
            left: screenXChar - CHAR_SIZE / 2,
            bottom: s.yFeet,
            width: CHAR_SIZE,
            height: CHAR_SIZE
          }}
        >
          <MonsterIcon
            color={monster.egg_color}
            size={CHAR_SIZE}
            stage={monster.stage}
            speed={monster.speed}
            technique={monster.technique}
            happy={!s.onGround}
            flip
          />
        </div>

        {/* 距離表示 */}
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 12,
            background: "rgba(43,27,16,0.8)",
            color: "white",
            borderRadius: 999,
            padding: "4px 12px",
            fontWeight: 900
          }}
        >
          {meters} m ・ {stageName}
        </div>
      </div>

      <div className="title" style={{ marginTop: 12, fontSize: 18 }}>
        {message}
      </div>

      {!started && !finished && (
        <button className="button green" onClick={start}>
          スタート
        </button>
      )}

      {started && !finished && (
        <button
          className="button green"
          onMouseDown={pressJump}
          onMouseUp={releaseJump}
          onMouseLeave={releaseJump}
          onTouchStart={(event) => {
            event.preventDefault();
            pressJump();
          }}
          onTouchEnd={(event) => {
            event.preventDefault();
            releaseJump();
          }}
        >
          ジャンプ！
        </button>
      )}
    </div>
  );
}
