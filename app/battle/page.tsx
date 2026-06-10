"use client";

import BottomNav from "@/components/BottomNav";
import MonsterIcon from "@/components/MonsterIcon";
import { ActiveMonster, getMyActiveMonster } from "@/lib/game";
import { supabase } from "@/lib/supabaseClient";
import { EggColor } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Opponent = {
  name: string;
  classroom: string;
  monsterName: string;
  eggColor: EggColor;
  hp: number;
  power: number;
  stamina: number;
  speed: number;
  technique: number;
};

const opponents: Opponent[] = [
  {
    name: "はると",
    classroom: "徳島体操",
    monsterName: "ワンダー",
    eggColor: "blue",
    hp: 80,
    power: 22,
    stamina: 80,
    speed: 15,
    technique: 12
  },
  {
    name: "みお",
    classroom: "北島教室",
    monsterName: "ピヨン",
    eggColor: "pink",
    hp: 75,
    power: 20,
    stamina: 75,
    speed: 24,
    technique: 18
  },
  {
    name: "そうた",
    classroom: "Sowers Club",
    monsterName: "シャドウハウンド",
    eggColor: "blue",
    hp: 95,
    power: 24,
    stamina: 95,
    speed: 18,
    technique: 24
  },
  {
    name: "ゆい",
    classroom: "阿南教室",
    monsterName: "モンガード",
    eggColor: "red",
    hp: 85,
    power: 27,
    stamina: 85,
    speed: 17,
    technique: 20
  }
];

export default function BattlePage() {
  const router = useRouter();

  const [monster, setMonster] = useState<ActiveMonster | null>(null);
  const [opponent, setOpponent] = useState<Opponent | null>(null);
  const [playerHp, setPlayerHp] = useState(0);
  const [enemyHp, setEnemyHp] = useState(0);
  const [log, setLog] = useState("対戦相手を探しています…");
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [resultText, setResultText] = useState("");
  const [battlesToday, setBattlesToday] = useState(0);

  const DAILY_LIMIT = 10;

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const current = await getMyActiveMonster();

    if (!current) {
      router.push("/login");
      return;
    }

    const randomOpponent =
      opponents[Math.floor(Math.random() * opponents.length)];

    setMonster(current);
    setOpponent(randomOpponent);
    setPlayerHp(Math.max(10, current.stamina_max + current.stamina));
    setEnemyHp(randomOpponent.hp);
    setLog(
      `${randomOpponent.classroom}の ${randomOpponent.name}さん とマッチング！`
    );

    // 当日のバトル回数を数える
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from("battles")
      .select("*", { count: "exact", head: true })
      .eq("child_id", current.child_id)
      .gte("created_at", start.toISOString());

    setBattlesToday(count || 0);
  }

  function wait(ms: number) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function calcDamage(
    attacker: {
      power: number;
      speed: number;
      technique: number;
    },
    defender: {
      speed: number;
    }
  ) {
    const avoidRate = Math.min(35, defender.speed * 0.8);
    const criticalRate = Math.min(35, attacker.technique * 0.8);

    if (Math.random() * 100 < avoidRate) {
      return {
        damage: 0,
        text: "よけた！"
      };
    }

    let damage = Math.floor(attacker.power * (0.75 + Math.random() * 0.4));

    if (damage <= 0) {
      damage = 1;
    }

    if (Math.random() * 100 < criticalRate) {
      damage = Math.floor(damage * 1.5);
      return {
        damage,
        text: `クリティカル！${damage}ダメージ！`
      };
    }

    return {
      damage,
      text: `${damage}ダメージ！`
    };
  }

  async function startBattle() {
    if (!monster || !opponent || started) {
      return;
    }

    if (battlesToday >= DAILY_LIMIT) {
      alert("本日のバトルは終了しました（10/10）。また明日挑戦してね！");
      return;
    }

    setStarted(true);
    setLog("バトル開始！");

    let pHp = Math.max(10, monster.stamina_max + monster.stamina);
    let eHp = opponent.hp;

    const playerBattleStats = {
      power: Math.max(1, monster.power + 10),
      speed: monster.speed + 10,
      technique: monster.technique + 10
    };

    const enemyBattleStats = {
      power: opponent.power,
      speed: opponent.speed,
      technique: opponent.technique
    };

    while (pHp > 0 && eHp > 0) {
      const playerAttack = calcDamage(playerBattleStats, {
        speed: opponent.speed
      });

      eHp -= playerAttack.damage;
      setEnemyHp(Math.max(0, eHp));
      setLog(`${monster.name}の攻撃！${playerAttack.text}`);
      await wait(1000);

      if (eHp <= 0) {
        break;
      }

      const enemyAttack = calcDamage(enemyBattleStats, {
        speed: monster.speed + 10
      });

      pHp -= enemyAttack.damage;
      setPlayerHp(Math.max(0, pHp));
      setLog(`${opponent.monsterName}の攻撃！${enemyAttack.text}`);
      await wait(1000);
    }

    const isWin = pHp > 0;
    const gained = isWin ? 10 : 5;

    await finishBattle(isWin, gained);
  }

  async function finishBattle(isWin: boolean, gained: number) {
    if (!monster) {
      return;
    }

    const nextBattlePower = monster.battle_power + gained;

    const { error: monsterError } = await supabase
      .from("monsters")
      .update({
        battle_power: nextBattlePower
      })
      .eq("id", monster.id);

    if (monsterError) {
      alert(monsterError.message);
      return;
    }

    const { error: battleError } = await supabase.from("battles").insert({
      child_id: monster.child_id,
      opponent_monster_id: null,
      result: isWin ? "win" : "lose",
      gained_battle_power: gained
    });

    if (battleError) {
      alert(battleError.message);
      return;
    }

    setBattlesToday((prev) => prev + 1);

    setMonster({
      ...monster,
      battle_power: nextBattlePower
    });

    setFinished(true);
    setResultText(
      isWin
        ? `勝利！戦闘力 +${gained}`
        : `負けても経験！戦闘力 +${gained}`
    );
    setLog(isWin ? "バトルに勝利した！" : "負けても成長した！");
  }

  if (!monster || !opponent) {
    return (
      <main className="page">
        <div className="phone">
          <div className="header">バトル</div>
          <div className="content">
            <div className="card">
              <div className="title">読み込み中…</div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const playerMaxHp = Math.max(10, monster.stamina_max + monster.stamina);
  const enemyMaxHp = opponent.hp;

  return (
    <main className="page">
      <div className="phone">
        <div className="header">モンスターバトル</div>

        <div className="content" style={{ paddingBottom: 92 }}>
          <div className="card">
            <div className="title">
              {opponent.classroom}の{opponent.name}さん
            </div>
            <div className="note">{opponent.monsterName}とマッチング！</div>
            <div
              style={{
                marginTop: 8,
                fontWeight: 900,
                color: battlesToday >= DAILY_LIMIT ? "#e53935" : "#2b1b10"
              }}
            >
              本日のバトル {battlesToday} / {DAILY_LIMIT}
            </div>
          </div>

          <div
            className="card"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              textAlign: "center"
            }}
          >
            <div>
              <MonsterIcon color={monster.egg_color} size={105} />
              <div style={{ fontWeight: 900, color: "#2b1b10" }}>
                {monster.name}
              </div>
              <HpBar hp={playerHp} max={playerMaxHp} />
            </div>

            <div>
              <MonsterIcon color={opponent.eggColor} size={105} />
              <div style={{ fontWeight: 900, color: "#2b1b10" }}>
                {opponent.monsterName}
              </div>
              <HpBar hp={enemyHp} max={enemyMaxHp} />
            </div>
          </div>

          <div className="card">
            <div
              style={{
                minHeight: 70,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 900,
                color: "#2b1b10",
                textAlign: "center",
                lineHeight: 1.5
              }}
            >
              {log}
            </div>
          </div>

          {finished && (
            <div className="card" style={{ textAlign: "center" }}>
              <div className="title">{resultText}</div>
              <div className="note">現在の戦闘力：{monster.battle_power}</div>
            </div>
          )}

          {!started && battlesToday < DAILY_LIMIT && (
            <button className="button red" onClick={startBattle}>
              バトル開始！
            </button>
          )}

          {!started && battlesToday >= DAILY_LIMIT && (
            <div className="card" style={{ textAlign: "center" }}>
              <div className="title">本日のバトルは終了</div>
              <div className="note">また明日挑戦してね！（10/10）</div>
              <button className="button" onClick={() => router.push("/home")}>
                ホームへ戻る
              </button>
            </div>
          )}

          {finished && (
            <button className="button" onClick={() => router.push("/home")}>
              ホームへ戻る
            </button>
          )}
        </div>
      </div>

      <BottomNav active="home" />
    </main>
  );
}

function HpBar({ hp, max }: { hp: number; max: number }) {
  const percent = max > 0 ? Math.max(0, Math.round((hp / max) * 100)) : 0;

  return (
    <div style={{ marginTop: 8 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 900,
          color: "#2b1b10",
          marginBottom: 3
        }}
      >
        HP {Math.max(0, hp)} / {max}
      </div>

      <div
        style={{
          height: 18,
          border: "3px solid #2b1b10",
          borderRadius: 999,
          overflow: "hidden",
          background: "#eee"
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${percent}%`,
            background: "#34b85a",
            transition: "0.3s"
          }}
        />
      </div>
    </div>
  );
}
