"use client";

import BottomNav from "@/components/BottomNav";
import MonsterIcon from "@/components/MonsterIcon";
import { ActiveMonster, getMyActiveMonster } from "@/lib/game";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type TrainingType = "power" | "technique" | "speed" | "stamina";

type TrainingConfig = {
  type: TrainingType;
  title: string;
  description: string;
  targetLabel: string;
};

const trainings: TrainingConfig[] = [
  {
    type: "power",
    title: "ストップトレーニング",
    description:
      "10秒間で、動くバーを真ん中の緑ゾーンで何回止められるかな？成功するほどバーが速くなる！",
    targetLabel: "パワー"
  },
  {
    type: "technique",
    title: "糸通しトレーニング",
    description:
      "長押しで上昇、はなすと下降。流れてくる壁のすき間を通ろう。1回でもぶつかったら終わり！",
    targetLabel: "テクニック"
  },
  {
    type: "speed",
    title: "連打トレーニング",
    description: "10秒間でできるだけたくさんタップ！回数で成長量が変わるよ。",
    targetLabel: "スピード"
  },
  {
    type: "stamina",
    title: "ランニングトレーニング",
    description:
      "「左」と「右」を交互にタップして走ろう！10秒間の歩数で成長量が変わるよ。",
    targetLabel: "スタミナ"
  }
];

export default function TrainingPage() {
  const router = useRouter();

  const [monster, setMonster] = useState<ActiveMonster | null>(null);
  const [selected, setSelected] = useState<TrainingType>("power");
  const [mode, setMode] = useState<"menu" | "playing" | "clear">("menu");
  const [earned, setEarned] = useState(0);

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

  const config = useMemo(() => {
    return trainings.find((item) => item.type === selected) || trainings[0];
  }, [selected]);

  async function onClear(amount: number) {
    if (!monster) {
      return;
    }

    const update: Partial<ActiveMonster> = {};

    if (selected === "power") {
      update.power = Math.min(monster.power + amount, monster.power_max);
    }

    if (selected === "technique") {
      update.technique = Math.min(monster.technique + amount, monster.technique_max);
    }

    if (selected === "speed") {
      update.speed = Math.min(monster.speed + amount, monster.speed_max);
    }

    if (selected === "stamina") {
      update.stamina = Math.min(monster.stamina + amount, monster.stamina_max);
    }

    const { error } = await supabase
      .from("monsters")
      .update(update)
      .eq("id", monster.id);

    if (error) {
      alert(error.message);
      return;
    }

    const nextMonster = {
      ...monster,
      ...update
    } as ActiveMonster;

    setMonster(nextMonster);
    setEarned(amount);
    setMode("clear");
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
      <div className="phone">
        <div className="header">トレーニング</div>

        <div className="content" style={{ paddingBottom: 92 }}>
          {mode === "menu" && (
            <>
              <div className="card" style={{ textAlign: "center" }}>
                <MonsterIcon color={monster.egg_color} size={120} />
                <div className="title" style={{ marginTop: 10 }}>
                  どのトレーニングをする？
                </div>
                <div className="note">
                  種で上がった限界値まで、トレーニングで現在値を伸ばします。
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
                >
                  {item.title}
                </button>
              ))}
            </>
          )}

          {mode === "playing" && selected === "power" && (
            <PowerTraining config={config} onClear={onClear} />
          )}

          {mode === "playing" && selected === "technique" && (
            <ThreadTraining config={config} onClear={onClear} />
          )}

          {mode === "playing" && selected === "speed" && (
            <TapTraining config={config} onClear={onClear} />
          )}

          {mode === "playing" && selected === "stamina" && (
            <RunningTraining config={config} onClear={onClear} />
          )}

          {mode === "clear" && (
            <div className="card" style={{ textAlign: "center" }}>
              <MonsterIcon color={monster.egg_color} size={120} />
              <div className="title">{config.targetLabel} +{earned}！</div>
              <div className="note">
                {config.targetLabel}が上がりました。ホームで確認しましょう。
              </div>

              <button className="button" onClick={() => router.push("/home")}>
                ホームへ戻る
              </button>

              <button
                className="button orange"
                onClick={() => setMode("menu")}
              >
                もう一度トレーニング
              </button>
            </div>
          )}
        </div>
      </div>

      <BottomNav active="home" />
    </main>
  );
}

// ① ストップ：10秒チャレンジ。成功回数で +1/+2/+3。成功ごとに加速。
function PowerTraining({
  config,
  onClear
}: {
  config: TrainingConfig;
  onClear: (amount: number) => void;
}) {
  const [position, setPosition] = useState(0);
  const posRef = useRef(0);
  const dirRef = useRef(1);
  const speedRef = useRef(2.4);
  const successRef = useRef(0);
  const firedRef = useRef(false);

  const [success, setSuccess] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [message, setMessage] = useState("ストップでスタート！");

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
          setFinished(true);

          if (!firedRef.current) {
            firedRef.current = true;
            const c = successRef.current;
            const points = c <= 3 ? 1 : c <= 5 ? 2 : 3;
            onClear(points);
          }

          return 0;
        }

        return next;
      });
    }, 100);

    return () => window.clearInterval(timer);
  }, [started, finished, onClear]);

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
      setSuccess(successRef.current);
      speedRef.current += 0.5;
      setMessage("ナイスストップ！");
    } else {
      setMessage("おしい！");
    }
  }

  return (
    <div className="card">
      <div className="title">{config.title}</div>
      <div className="note">{config.description}</div>

      <div
        style={{
          height: 80,
          border: "4px solid #2b1b10",
          borderRadius: 999,
          position: "relative",
          marginTop: 20,
          background: "#ffe0a6",
          overflow: "hidden"
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
            borderRight: "4px dashed #2b1b10"
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
      </div>

      <div className="title" style={{ marginTop: 16 }}>
        {message}
      </div>

      <div className="note">
        のこり {timeLeft.toFixed(1)} 秒 ・ 成功 {success} 回
      </div>
      <div className="note">3回以下→+1 / 4・5回→+2 / 6回以上→+3</div>

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
  onClear: (amount: number) => void;
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
    finished: false
  });

  const BIRD_X = 18;
  const HALF_GAP = 17;
  const WALL_HALF = 7;

  useEffect(() => {
    const timer = window.setInterval(() => {
      const s = state.current;

      if (!s.started || s.finished) {
        return;
      }

      // 鳥の上下
      s.y += s.pressing ? -2.4 : 2.4;
      if (s.y < 5) s.y = 5;
      if (s.y > 95) s.y = 95;

      // 壁を左へ
      for (const w of s.walls) {
        w.x -= 1.7;
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
          if (s.y < w.gap - HALF_GAP || s.y > w.gap + HALF_GAP) {
            hit = true;
          }
        }
      }

      // 画面外の壁を削除
      s.walls = s.walls.filter((w) => w.x > -16);

      setPassedView(s.passed);

      if (hit) {
        s.finished = true;
        setFinished(true);
        const p = s.passed <= 3 ? 1 : s.passed <= 6 ? 2 : 3;
        setMessage(`ぶつかった！ ${s.passed}回通過 → テクニック +${p}`);
        onClear(p);
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

  return (
    <div className="card">
      <div className="title">{config.title}</div>
      <div className="note">{config.description}</div>

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
                height: `${Math.max(0, w.gap - HALF_GAP)}%`,
                background: "#2f8ee5",
                border: "3px solid #2b1b10"
              }}
            />
            <div
              style={{
                position: "absolute",
                left: `${w.x}%`,
                top: `${w.gap + HALF_GAP}%`,
                transform: "translateX(-50%)",
                width: `${WALL_HALF * 2}%`,
                height: `${Math.max(0, 100 - (w.gap + HALF_GAP))}%`,
                background: "#2f8ee5",
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
      <div className="note">通過：{passedView} 回</div>
      <div className="note">0〜3→+1 / 4〜6→+2 / 7以上→+3</div>

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
function TapTraining({
  config,
  onClear
}: {
  config: TrainingConfig;
  onClear: (amount: number) => void;
}) {
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [count, setCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const countRef = useRef(0);
  const firedRef = useRef(false);

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
            const points = c <= 30 ? 1 : c <= 70 ? 2 : 3;
            onClear(points);
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
  }

  return (
    <div className="card">
      <div className="title">{config.title}</div>
      <div className="note">{config.description}</div>

      <div
        style={{
          height: 200,
          border: "4px solid #2b1b10",
          borderRadius: 24,
          marginTop: 16,
          background: "linear-gradient(#ffecec, #fffafa)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center"
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 900, color: "#ff3d3d" }}>
          {timeLeft.toFixed(1)}
        </div>
        <div style={{ fontSize: 26, fontWeight: 900, color: "#2b1b10" }}>
          連打：{count} 回
        </div>
      </div>

      <div className="note" style={{ marginTop: 12 }}>
        30回以下→+1 / 31〜70回→+2 / 71回以上→+3
      </div>

      <button className="button red" onClick={tap}>
        {started ? "連打！" : "スタート（タップ！）"}
      </button>
    </div>
  );
}

// ④ ランニング（スタミナ）：左右の足を交互にタップ。10秒の歩数で +1/+2/+3。
function RunningTraining({
  config,
  onClear
}: {
  config: TrainingConfig;
  onClear: (amount: number) => void;
}) {
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [steps, setSteps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [message, setMessage] = useState("「左」からスタート！");

  const stepsRef = useRef(0);
  const nextFootRef = useRef<"L" | "R">("L");
  const firedRef = useRef(false);

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
            const c = stepsRef.current;
            const points = c <= 15 ? 1 : c <= 30 ? 2 : 3;
            onClear(points);
          }

          return 0;
        }

        return next;
      });
    }, 100);

    return () => window.clearInterval(timer);
  }, [started, finished, onClear]);

  function step(foot: "L" | "R") {
    if (finished) {
      return;
    }

    if (!started) {
      setStarted(true);
    }

    if (foot === nextFootRef.current) {
      stepsRef.current += 1;
      setSteps(stepsRef.current);
      nextFootRef.current = nextFootRef.current === "L" ? "R" : "L";
      setMessage(nextFootRef.current === "L" ? "つぎは「左」！" : "つぎは「右」！");
    } else {
      setMessage("交互にタップ！");
    }
  }

  return (
    <div className="card">
      <div className="title">{config.title}</div>
      <div className="note">{config.description}</div>

      <div
        style={{
          height: 160,
          border: "4px solid #2b1b10",
          borderRadius: 24,
          marginTop: 16,
          background: "linear-gradient(#eafff1, #d6f5df)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center"
        }}
      >
        <div style={{ fontSize: 30, fontWeight: 900, color: "#34b85a" }}>
          {timeLeft.toFixed(1)} 秒
        </div>
        <div style={{ fontSize: 26, fontWeight: 900, color: "#2b1b10" }}>
          {steps} 歩
        </div>
      </div>

      <div className="title" style={{ marginTop: 12, fontSize: 18 }}>
        {message}
      </div>
      <div className="note">15歩以下→+1 / 16〜30歩→+2 / 31歩以上→+3</div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginTop: 6
        }}
      >
        <button className="button green" onClick={() => step("L")}>
          左
        </button>
        <button className="button blue" onClick={() => step("R")}>
          右
        </button>
      </div>
    </div>
  );
}
