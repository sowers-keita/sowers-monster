"use client";

import BottomNav from "@/components/BottomNav";
import MonsterIcon from "@/components/MonsterIcon";
import { ActiveMonster, getMyActiveMonster, getMyChild } from "@/lib/game";
import { supabase } from "@/lib/supabaseClient";
import { EggColor } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Opponent = {
  id: string;
  name: string;
  classroom: string;
  monsterName: string;
  eggColor: EggColor;
  stage?: string;
  hp: number;
  power: number;
  stamina: number;
  speed: number;
  technique: number;
};

const BSTAGE_SIZE: Record<string, number> = {
  スタート期: 64,
  ビギナー期: 98,
  ヒーロー期: 112,
  覚醒期: 126
};
function bSize(stage?: string) {
  return (stage && BSTAGE_SIZE[stage]) || 105;
}

// ===== マッチング履歴（同じ相手ばかりにならないように） =====
const SAME_OPP_DAILY_LIMIT = 2; // 同じ相手とは1日2回まで

function battleToday() {
  return new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD（ローカル）
}
function recentKey(childId: string) {
  return `swm_recent_opp_${childId}`;
}
function getRecentOpp(childId: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(recentKey(childId)) || "[]");
  } catch {
    return [];
  }
}
function oppDayCount(childId: string, oppId: string) {
  return Number(
    localStorage.getItem(`swm_oppday_${childId}_${oppId}_${battleToday()}`) || "0"
  );
}
function recordOpponent(childId: string, oppId: string) {
  if (!oppId) {
    return;
  }
  const k = `swm_oppday_${childId}_${oppId}_${battleToday()}`;
  localStorage.setItem(k, String(oppDayCount(childId, oppId) + 1));
  let recent = getRecentOpp(childId);
  recent.push(oppId);
  if (recent.length > 6) {
    recent = recent.slice(-6);
  }
  localStorage.setItem(recentKey(childId), JSON.stringify(recent));
}

// 体力（HP）：基礎体力100＋スタミナ1ごとに+10
function hpFromStamina(stamina: number) {
  return 100 + Math.max(0, stamina) * 10;
}

const opponents: Opponent[] = [
  {
    id: "cpu_haruto",
    name: "はると",
    classroom: "徳島体操",
    monsterName: "ワンダー",
    eggColor: "blue",
    hp: 130,
    power: 22,
    stamina: 80,
    speed: 15,
    technique: 12
  },
  {
    id: "cpu_mio",
    name: "みお",
    classroom: "北島教室",
    monsterName: "ピヨン",
    eggColor: "pink",
    hp: 120,
    power: 20,
    stamina: 75,
    speed: 24,
    technique: 18
  },
  {
    id: "cpu_souta",
    name: "そうた",
    classroom: "Sowers Club",
    monsterName: "シャドウハウンド",
    eggColor: "blue",
    hp: 160,
    power: 24,
    stamina: 95,
    speed: 18,
    technique: 24
  },
  {
    id: "cpu_yui",
    name: "ゆい",
    classroom: "阿南教室",
    monsterName: "モンガード",
    eggColor: "red",
    hp: 140,
    power: 27,
    stamina: 85,
    speed: 17,
    technique: 20
  }
];

type RealMonsterRow = {
  id: string;
  name: string;
  egg_color: EggColor;
  stage?: string;
  power: number;
  stamina: number;
  stamina_max: number;
  speed: number;
  technique: number;
  child_id: string;
  children?: {
    name: string;
    classroom_id?: string | null;
    classrooms?: { name: string } | null;
  } | null;
};

// 50%は同じ教室・50%は他教室から。同じ相手の連続・1日2回超えを避ける。
function pickOpponentRow(
  rows: RealMonsterRow[],
  myClassroomId: string | null,
  myChildId: string
): RealMonsterRow | null {
  const recent = getRecentOpp(myChildId);
  const lastOpp = recent[recent.length - 1];

  // 1日2回まで＆直前の相手は除外
  const pool = rows.filter(
    (r) => oppDayCount(myChildId, r.id) < SAME_OPP_DAILY_LIMIT && r.id !== lastOpp
  );

  if (pool.length === 0) {
    return null;
  }

  const same = pool.filter(
    (r) => r.children?.classroom_id && r.children.classroom_id === myClassroomId
  );
  const other = pool.filter(
    (r) => !(r.children?.classroom_id && r.children.classroom_id === myClassroomId)
  );

  const useSame = Math.random() < 0.5;
  const primary = useSame ? same : other;
  const secondary = useSame ? other : same;
  let cand = primary.length > 0 ? primary : secondary;
  if (cand.length === 0) {
    cand = pool;
  }

  // 直近で当たった相手は優先度を下げる
  const fresh = cand.filter((r) => !recent.includes(r.id));
  const finalPool = fresh.length > 0 ? fresh : cand;

  return finalPool[Math.floor(Math.random() * finalPool.length)];
}

export default function BattlePage() {
  const router = useRouter();

  const [monster, setMonster] = useState<ActiveMonster | null>(null);
  const [opponent, setOpponent] = useState<Opponent | null>(null);
  const [playerHp, setPlayerHp] = useState(0);
  const [enemyHp, setEnemyHp] = useState(0);
  const [log, setLog] = useState("対戦相手を探しています…");
  const [pAnim, setPAnim] = useState<{
    type: "idle" | "attack" | "jump";
    expr: "normal" | "happy" | "angry" | "sad";
    k: number;
  }>({ type: "idle", expr: "normal", k: 0 });
  const [oAnim, setOAnim] = useState<{
    type: "idle" | "attack" | "jump";
    expr: "normal" | "happy" | "angry" | "sad";
    k: number;
  }>({ type: "idle", expr: "normal", k: 0 });
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [resultText, setResultText] = useState("");
  const [battlesToday, setBattlesToday] = useState(0);
  const [view, setView] = useState<"menu" | "online">("menu");

  const DAILY_LIMIT = 10;

  useEffect(() => {
    load();
    if (typeof window !== "undefined") {
      const mode = new URLSearchParams(window.location.search).get("mode");
      if (mode === "online") {
        setView("online");
      }
    }
  }, []);

  async function load() {
    const child = await getMyChild();
    const current = await getMyActiveMonster();

    if (!current) {
      router.push("/login");
      return;
    }

    setMonster(current);
    setPlayerHp(hpFromStamina(current.stamina));

    const myClassroomId = child?.classroom_id || null;

    // 他の登録ユーザーのモンスターから対戦相手を探す
    const { data: others } = await supabase
      .from("monsters")
      .select(
        `id, name, egg_color, stage, power, stamina, stamina_max, speed, technique, child_id,
         children ( name, classroom_id, classrooms ( name ) )`
      )
      .eq("is_active", true)
      .neq("child_id", current.child_id);

    const rows = (others || []) as unknown as RealMonsterRow[];
    const pick = pickOpponentRow(rows, myClassroomId, current.child_id);

    let chosen: Opponent;

    if (pick) {
      chosen = {
        id: pick.id,
        name: pick.children?.name || "だれか",
        classroom: pick.children?.classrooms?.name || "Sowers Club",
        monsterName: pick.name,
        eggColor: pick.egg_color,
        stage: pick.stage,
        hp: hpFromStamina(pick.stamina),
        power: Math.max(1, pick.power + 10),
        stamina: pick.stamina,
        speed: pick.speed + 10,
        technique: pick.technique + 10
      };
    } else {
      // 相手がいない／全員1日2回に達したとき等はCPUと対戦（直前の相手は避ける）
      const recent = getRecentOpp(current.child_id);
      const lastOpp = recent[recent.length - 1];
      const cpuPool = opponents.filter((o) => o.id !== lastOpp);
      const cpu = cpuPool.length > 0 ? cpuPool : opponents;
      chosen = cpu[Math.floor(Math.random() * cpu.length)];
    }

    setOpponent(chosen);
    setEnemyHp(chosen.hp);
    setLog(`${chosen.classroom}の ${chosen.name}さん とマッチング！`);

    // 当日のバトル回数を数える（今のモンスターになってから＝リセット後の分だけ）
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const created = new Date(current.created_at);
    const since = created > start ? created : start;

    const { count } = await supabase
      .from("battles")
      .select("*", { count: "exact", head: true })
      .eq("child_id", current.child_id)
      .gte("created_at", since.toISOString());

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

  function actPlayer(
    type: "idle" | "attack" | "jump",
    expr: "normal" | "happy" | "angry" | "sad"
  ) {
    setPAnim((a) => ({ type, expr, k: a.k + 1 }));
  }

  function actOpponent(
    type: "idle" | "attack" | "jump",
    expr: "normal" | "happy" | "angry" | "sad"
  ) {
    setOAnim((a) => ({ type, expr, k: a.k + 1 }));
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

    let pHp = hpFromStamina(monster.stamina);
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

      // 自分の攻撃：踏み込んで動く。クリティカルは怒りの表情。
      const isCrit = playerAttack.text.includes("クリティカル");
      actPlayer("attack", isCrit ? "angry" : "normal");
      // 相手が自分の攻撃をよけたら、相手はジャンプして喜ぶ。
      if (playerAttack.damage === 0) {
        actOpponent("jump", "happy");
      } else {
        actOpponent("idle", "normal");
      }

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

      // 相手の攻撃：踏み込んで動く。クリティカルは怒りの表情。
      const enemyCrit = enemyAttack.text.includes("クリティカル");
      actOpponent("attack", enemyCrit ? "angry" : "normal");
      // 相手の攻撃をよけたら、自分はジャンプして喜ぶ。
      if (enemyAttack.damage === 0) {
        actPlayer("jump", "happy");
      } else {
        actPlayer("idle", "normal");
      }

      pHp -= enemyAttack.damage;
      setPlayerHp(Math.max(0, pHp));
      setLog(`${opponent.monsterName}の攻撃！${enemyAttack.text}`);
      await wait(1000);
    }

    const isWin = pHp > 0;
    const gained = isWin ? 10 : 5;

    // 勝ったら自分は喜び・相手は悲しみ（負けたら逆）。
    actPlayer(isWin ? "jump" : "idle", isWin ? "happy" : "sad");
    actOpponent(isWin ? "idle" : "jump", isWin ? "sad" : "happy");

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

    // 同じ相手とのマッチング回数・直近履歴を記録
    if (opponent) {
      recordOpponent(monster.child_id, opponent.id);
    }

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

  // バトルのハブ：上＝オンライン対戦、下＝友達とオフライン対戦
  if (view === "menu") {
    return (
      <main className="page">
        <div className="phone">
          <div className="header">バトル</div>
          <div className="content" style={{ paddingBottom: 92 }}>
            <div className="card" style={{ textAlign: "center" }}>
              <MonsterIcon
                color={monster.egg_color}
                size={110}
                stage={monster.stage}
                speed={monster.speed}
                technique={monster.technique}
              />
              <div className="title" style={{ marginTop: 8 }}>
                どっちで バトルする？
              </div>
            </div>

            <button
              className="button red"
              onClick={() => setView("online")}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                lineHeight: 1.2,
                minHeight: 76
              }}
            >
              <span style={{ fontSize: 22 }}>🌐 オンラインで対戦</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>
                ぜんこくの みんなと（1日10回）
              </span>
            </button>

            <button
              className="button blue"
              onClick={() => router.push("/versus")}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                lineHeight: 1.2,
                minHeight: 76
              }}
            >
              <span style={{ fontSize: 22 }}>👥 友達とオフライン対戦</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>
                QRを見せ合って たたかう
              </span>
            </button>
          </div>
        </div>
        <BottomNav active="battle" />
      </main>
    );
  }

  const playerMaxHp = hpFromStamina(monster.stamina);
  const enemyMaxHp = opponent.hp;

  return (
    <main className="page">
      <div className="phone">
        <style>{`
.b-attack{animation:b-attack .45s ease;}
@keyframes b-attack{0%{transform:translateX(0);}40%{transform:translateX(26px) scale(1.06);}100%{transform:translateX(0);}}
.b-attack-l{animation:b-attack-l .45s ease;}
@keyframes b-attack-l{0%{transform:translateX(0);}40%{transform:translateX(-26px) scale(1.06);}100%{transform:translateX(0);}}
.b-jump{animation:b-jump .55s ease;}
@keyframes b-jump{0%{transform:translateY(0);}35%{transform:translateY(-26px);}70%{transform:translateY(0);}85%{transform:translateY(-8px);}100%{transform:translateY(0);}}
`}</style>
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
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
              imageRendering: "pixelated",
              background: [
                "linear-gradient(180deg,transparent 0 72%,#6e7787 72% 75%,#59616f 75% 100%)",
                (() => {
                  const h = new Date().getHours();
                  return h < 5 || h >= 19
                    ? "linear-gradient(180deg,#16204a 0 40%,#2a356a 40% 41%,transparent 41%)"
                    : h >= 16
                    ? "linear-gradient(180deg,#ff9e6b 0 40%,#ffc79a 40% 41%,transparent 41%)"
                    : "linear-gradient(180deg,#9fd0ff 0 40%,#cfe9ff 40% 41%,transparent 41%)";
                })(),
                "repeating-linear-gradient(90deg,transparent 0 8px,rgba(255,234,150,0.8) 8px 14px,transparent 14px 40px)",
                "repeating-linear-gradient(90deg,#3f4a63 0 40px,#4a5773 40px 44px,#36405a 44px 80px)"
              ].join(",")
            }}
          >
            <div>
              <div
                key={pAnim.k}
                className={
                  pAnim.type === "attack"
                    ? "b-attack"
                    : pAnim.type === "jump"
                    ? "b-jump"
                    : ""
                }
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  height: 130
                }}
              >
                <MonsterIcon
                  color={monster.egg_color}
                  size={bSize(monster.stage)}
                  expression={pAnim.expr}
                  stage={monster.stage}
                  speed={monster.speed}
                  technique={monster.technique}
                  flip
                />
              </div>
              <div style={{ fontWeight: 900, color: "#2b1b10" }}>
                {monster.name}
              </div>
              <HpBar hp={playerHp} max={playerMaxHp} />
            </div>

            <div>
              <div
                key={oAnim.k}
                className={
                  oAnim.type === "attack"
                    ? "b-attack-l"
                    : oAnim.type === "jump"
                    ? "b-jump"
                    : ""
                }
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  height: 130
                }}
              >
                <MonsterIcon
                  color={opponent.eggColor}
                  size={bSize(opponent.stage)}
                  expression={oAnim.expr}
                  stage={opponent.stage}
                  speed={opponent.speed}
                  technique={opponent.technique}
                />
              </div>
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

      <BottomNav active="battle" />
    </main>
  );
}

function HpBar({ hp, max }: { hp: number; max: number }) {
  const percent = max > 0 ? Math.max(0, Math.round((hp / max) * 100)) : 0;
  // 半分以下で黄色、2割以下で赤
  const barColor =
    percent <= 20 ? "#ff3b30" : percent <= 50 ? "#ffcc00" : "#34b85a";

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
            background: barColor,
            transition: "0.3s"
          }}
        />
      </div>
    </div>
  );
}
