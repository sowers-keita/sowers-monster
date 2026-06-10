"use client";

import BottomNav from "@/components/BottomNav";
import MonsterIcon from "@/components/MonsterIcon";
import { ActiveMonster, getMyActiveMonster } from "@/lib/game";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type StatType = "power" | "stamina" | "speed" | "technique";
type TrainingType = "friend" | "running" | "stop" | "thread";

type TrainingConfig = {
  type: TrainingType;
  stat: StatType;
  title: string;
  description: string;
  targetLabel: string;
};

const trainings: TrainingConfig[] = [
  {
    type: "friend",
    stat: "power",
    title: "連打トレーニング",
    description:
      "10秒間でできるだけたくさんタップ！回数が多いほどパワーがアップするよ。",
    targetLabel: "パワー"
  },
  {
    type: "running",
    stat: "stamina",
    title: "ランニングトレーニング",
    description:
      "草原を自動で走るよ！タップで小ジャンプ・長押しで大ジャンプ。崖に落ちずに何メートル進めるかな？",
    targetLabel: "スタミナ"
  },
  {
    type: "stop",
    stat: "speed",
    title: "ストップトレーニング",
    description:
      "動くバーを真ん中の緑ゾーンで何回止められるかな？成功するほどバーが速くなる！スピードが上がるよ。",
    targetLabel: "スピード"
  },
  {
    type: "thread",
    stat: "technique",
    title: "糸通しトレーニング",
    description:
      "長押しで上昇、はなすと下降。流れてくる壁のすき間を通ろう。1回でもぶつかったら終わり！テクニックが上がるよ。",
    targetLabel: "テクニック"
  }
];

export default function TrainingPage() {
  const router = useRouter();

  const [monster, setMonster] = useState<ActiveMonster | null>(null);
  const [selected, setSelected] = useState<TrainingType>("friend");
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

    if (config.stat === "power") {
      update.power = Math.min(monster.power + amount, monster.power_max);
    }

    if (config.stat === "technique") {
      update.technique = Math.min(monster.technique + amount, monster.technique_max);
    }

    if (config.stat === "speed") {
      update.speed = Math.min(monster.speed + amount, monster.speed_max);
    }

    if (config.stat === "stamina") {
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

          {mode === "playing" && selected === "friend" && (
            <TapTraining config={config} onClear={onClear} />
          )}

          {mode === "playing" && selected === "running" && (
            <RunningTraining config={config} onClear={onClear} />
          )}

          {mode === "playing" && selected === "stop" && (
            <PowerTraining config={config} onClear={onClear} />
          )}

          {mode === "playing" && selected === "thread" && (
            <ThreadTraining config={config} onClear={onClear} />
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

// ④ ランニング（スタミナ）：マリオ風の横スクロール・プラットフォーマー。
//    自動で右に進む。タップで小ジャンプ、長押しで大ジャンプ。
//    崖に落ちる or 段差に引っかかって画面外に出ると終了。進んだメートルで判定。
//    5m以下→+1 / 6〜19m→+2 / 20m以上→+3。
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
  onClear
}: {
  config: TrainingConfig;
  onClear: (amount: number) => void;
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
    finished: false
  });

  useEffect(() => {
    const DT = 0.03; // 30msごと（＝1秒に1メートル）
    const timer = window.setInterval(() => {
      const s = g.current;

      if (!s.started || s.finished) {
        return;
      }

      // カメラは一定速度で進む
      s.camX += SPEED_MPS * DT;

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
        s.charX += SPEED_MPS * DT;
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

      // 終了判定：崖に落ちた or 引っかかって画面外
      if (s.yFeet < -50 || screenX < -CHAR_SIZE) {
        s.finished = true;
        setFinished(true);
        const meters = Math.max(0, Math.floor(s.charX));
        const points = meters < 6 ? 1 : meters < 20 ? 2 : 3;
        setMessage(`${meters}メートル！ スタミナ +${points}`);
        if (!firedRef.current) {
          firedRef.current = true;
          onClear(points);
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
      <div className="note">{config.description}</div>

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
          // 草原：空→草へ
          background:
            "linear-gradient(#aee4ff 0%, #c8efff 45%, #8ed861 45%, #74c948 100%)"
        }}
      >
        {/* 雲 */}
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
                background: "#7a4a25",
                borderTop: "6px solid #59b13a",
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
          <MonsterIcon color="red" size={CHAR_SIZE} />
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
          {meters} m
        </div>
      </div>

      <div className="title" style={{ marginTop: 12, fontSize: 18 }}>
        {message}
      </div>
      <div className="note">
        タップ＝小ジャンプ／長押し＝大ジャンプ　5m以下→+1 / 6〜19m→+2 / 20m以上→+3
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
