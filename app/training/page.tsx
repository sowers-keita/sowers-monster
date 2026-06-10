"use client";

import BottomNav from "@/components/BottomNav";
import MonsterIcon from "@/components/MonsterIcon";
import { ActiveMonster, getMyActiveMonster } from "@/lib/game";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type TrainingType = "power" | "technique" | "speed";

type TrainingConfig = {
  type: TrainingType;
  title: string;
  description: string;
  targetLabel: string;
  clearText: string;
};

const trainings: TrainingConfig[] = [
  {
    type: "power",
    title: "ストップトレーニング",
    description: "動くゲージを真ん中で止めよう。5回成功でクリア。",
    targetLabel: "パワー",
    clearText: "パワーアップ！"
  },
  {
    type: "technique",
    title: "糸通しトレーニング",
    description: "長押しで上昇、離すと下降。10秒当たらず進もう。",
    targetLabel: "テクニック",
    clearText: "テクニックアップ！"
  },
  {
    type: "speed",
    title: "連打トレーニング",
    description: "10秒間で20回以上タップしよう。",
    targetLabel: "スピード",
    clearText: "スピードアップ！"
  }
];

export default function TrainingPage() {
  const router = useRouter();

  const [monster, setMonster] = useState<ActiveMonster | null>(null);
  const [selected, setSelected] = useState<TrainingType>("power");
  const [mode, setMode] = useState<"menu" | "playing" | "clear">("menu");

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

  async function onClear() {
    if (!monster) {
      return;
    }

    const update: Partial<ActiveMonster> = {};

    if (selected === "power") {
      update.power = Math.min(monster.power + 1, monster.power_max);
    }

    if (selected === "technique") {
      update.technique = Math.min(monster.technique + 1, monster.technique_max);
    }

    if (selected === "speed") {
      update.speed = Math.min(monster.speed + 1, monster.speed_max);
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

          {mode === "clear" && (
            <div className="card" style={{ textAlign: "center" }}>
              <MonsterIcon color={monster.egg_color} size={120} />
              <div className="title">{config.clearText}</div>
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

function PowerTraining({
  config,
  onClear
}: {
  config: TrainingConfig;
  onClear: () => void;
}) {
  const [position, setPosition] = useState(0);
  const [direction, setDirection] = useState(1);
  const [success, setSuccess] = useState(0);
  const [message, setMessage] = useState("5回成功でクリア！");

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPosition((prev) => {
        let next = prev + direction * 6;

        if (next >= 100) {
          next = 100;
          setDirection(-1);
        }

        if (next <= 0) {
          next = 0;
          setDirection(1);
        }

        return next;
      });
    }, 45);

    return () => window.clearInterval(timer);
  }, [direction]);

  function stop() {
    if (position >= 35 && position <= 65) {
      const next = success + 1;
      setSuccess(next);
      setMessage("ナイスストップ！");

      if (next >= 5) {
        onClear();
      }
    } else {
      setMessage("おしい！もう一回！");
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
            left: "35%",
            width: "30%",
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

      <div className="note">成功：{success} / 5</div>

      <button className="button red" onClick={stop}>
        パンチ！
      </button>
    </div>
  );
}

function ThreadTraining({
  config,
  onClear
}: {
  config: TrainingConfig;
  onClear: () => void;
}) {
  const [started, setStarted] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [time, setTime] = useState(0);
  const [y, setY] = useState(50);
  const [message, setMessage] = useState("10秒当たらず進もう！");

  useEffect(() => {
    if (!started) {
      return;
    }

    const timer = window.setInterval(() => {
      setTime((prev) => {
        const next = prev + 0.1;

        if (next >= 10) {
          window.clearInterval(timer);
          onClear();
        }

        return next;
      });

      setY((prev) => {
        const next = pressing ? prev - 3 : prev + 3;
        return Math.max(10, Math.min(90, next));
      });
    }, 100);

    return () => window.clearInterval(timer);
  }, [started, pressing, onClear]);

  return (
    <div className="card">
      <div className="title">{config.title}</div>
      <div className="note">{config.description}</div>

      <div
        style={{
          height: 280,
          border: "4px solid #2b1b10",
          borderRadius: 24,
          marginTop: 16,
          background: "linear-gradient(#dff3ff, #f7fbff)",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 60,
            top: `${y}%`,
            transform: "translateY(-50%)",
            width: 64,
            height: 24,
            background: "#111",
            borderRadius: 999
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 60,
            top: 0,
            bottom: 0,
            width: 38,
            background: "#2f8ee5",
            borderLeft: "4px solid #2b1b10",
            borderRight: "4px solid #2b1b10"
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 55,
            top: "35%",
            width: 48,
            height: 120,
            background: "#f7fbff",
            borderTop: "4px solid #2b1b10",
            borderBottom: "4px solid #2b1b10"
          }}
        />
      </div>

      <div className="title" style={{ marginTop: 16 }}>
        {message}
      </div>
      <div className="note">経過：{time.toFixed(1)} / 10秒</div>

      {!started && (
        <button
          className="button blue"
          onClick={() => {
            setStarted(true);
            setMessage("長押しで上昇、離すと下降！");
          }}
        >
          スタート
        </button>
      )}

      {started && (
        <button
          className="button blue"
          onMouseDown={() => setPressing(true)}
          onMouseUp={() => setPressing(false)}
          onMouseLeave={() => setPressing(false)}
          onTouchStart={() => setPressing(true)}
          onTouchEnd={() => setPressing(false)}
        >
          長押しで上昇
        </button>
      )}
    </div>
  );
}

function TapTraining({
  config,
  onClear
}: {
  config: TrainingConfig;
  onClear: () => void;
}) {
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [count, setCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);

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

          if (count >= 20) {
            onClear();
          }
        }

        return Math.max(0, next);
      });
    }, 100);

    return () => window.clearInterval(timer);
  }, [started, finished, count, onClear]);

  function tap() {
    if (finished) {
      return;
    }

    if (!started) {
      setStarted(true);
    }

    setCount((prev) => prev + 1);
  }

  return (
    <div className="card">
      <div className="title">{config.title}</div>
      <div className="note">{config.description}</div>

      <div
        style={{
          height: 220,
          border: "4px solid #2b1b10",
          borderRadius: 24,
          marginTop: 16,
          background: "linear-gradient(#ffecec, #fffafa)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: 50,
          fontWeight: 900,
          color: "#ff3d3d"
        }}
      >
        {timeLeft.toFixed(1)}
      </div>

      <div className="title" style={{ marginTop: 16 }}>
        連打：{count} / 20
      </div>

      <button className="button red" onClick={tap}>
        {started ? "連打！" : "スタート"}
      </button>

      {finished && count < 20 && (
        <button
          className="button orange"
          onClick={() => {
            setStarted(false);
            setFinished(false);
            setCount(0);
            setTimeLeft(10);
          }}
        >
          もう一回
        </button>
      )}
    </div>
  );
}
