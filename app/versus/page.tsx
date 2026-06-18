"use client";

import BottomNav from "@/components/BottomNav";
import MonsterIcon from "@/components/MonsterIcon";
import { ActiveMonster, addSeedToChild, getMyActiveMonster } from "@/lib/game";
import { supabase } from "@/lib/supabaseClient";
import { EggColor } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type OppData = {
  id: string;
  name: string;
  color: EggColor;
  stage: string;
  power: number;
  stamina: number;
  speed: number;
  technique: number;
  battlePower: number;
};

type Anim = {
  type: "idle" | "attack" | "jump";
  expr: "normal" | "happy" | "angry" | "sad";
  k: number;
};

// 体力（HP）：基礎100＋スタミナ1ごとに+10
function hpFromStamina(stamina: number) {
  return 100 + Math.max(0, stamina) * 10;
}

function calcDamage(
  attacker: { power: number; speed: number; technique: number },
  defender: { speed: number }
) {
  const avoidRate = Math.min(35, defender.speed * 0.8);
  const criticalRate = Math.min(35, attacker.technique * 0.8);

  if (Math.random() * 100 < avoidRate) {
    return { damage: 0, text: "よけた！" };
  }

  let damage = Math.floor(attacker.power * (0.75 + Math.random() * 0.4));
  if (damage <= 0) {
    damage = 1;
  }

  if (Math.random() * 100 < criticalRate) {
    damage = Math.floor(damage * 1.5);
    return { damage, text: `クリティカル！${damage}ダメージ！` };
  }

  return { damage, text: `${damage}ダメージ！` };
}

const LIMIT_SAME = 3; // 同じ相手とは1日3回まで

function todayStr() {
  return new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD（ローカル）
}

function versusKey(myChild: string, oppId: string) {
  return `swm_versus_${myChild}_${oppId}_${todayStr()}`;
}

// オフライン対戦の累計（相手を問わず合計）。虹の種ゲージ用。
function versusTotalKey(myChild: string) {
  return `swm_versus_total_${myChild}`;
}

export default function VersusPage() {
  const router = useRouter();

  const [monster, setMonster] = useState<ActiveMonster | null>(null);
  const [mode, setMode] = useState<"menu" | "show" | "scan" | "battle">("menu");
  const [opp, setOpp] = useState<OppData | null>(null);
  const [scanErr, setScanErr] = useState("");
  const [manual, setManual] = useState("");

  const myQrRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);

  // バトル進行
  const [playerHp, setPlayerHp] = useState(0);
  const [enemyHp, setEnemyHp] = useState(0);
  const [log, setLog] = useState("");
  const [pAnim, setPAnim] = useState<Anim>({
    type: "idle",
    expr: "normal",
    k: 0
  });
  const [oAnim, setOAnim] = useState<Anim>({
    type: "idle",
    expr: "normal",
    k: 0
  });
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [resultText, setResultText] = useState("");
  const [gotRainbow, setGotRainbow] = useState(false);

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
    setPlayerHp(hpFromStamina(current.stamina));
  }

  // 自分のQRを表示
  useEffect(() => {
    if (mode !== "show" || !monster) {
      return;
    }

    const payload = JSON.stringify({
      v: 1,
      id: monster.id,
      n: monster.name,
      c: monster.egg_color,
      s: monster.stage,
      p: monster.power,
      st: monster.stamina,
      sp: monster.speed,
      t: monster.technique,
      bp: monster.battle_power
    });

    import("qrcode").then((QR) => {
      if (myQrRef.current) {
        QR.toCanvas(myQrRef.current, payload, { width: 240, margin: 1 }).catch(
          () => {}
        );
      }
    });
  }, [mode, monster]);

  // カメラでQRを読み取り
  useEffect(() => {
    if (mode !== "scan") {
      return;
    }

    let active = true;
    setScanErr("");

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (!active) {
          return;
        }
        const scanner = new Html5Qrcode("reader");
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 220 },
          (text: string) => onScan(text),
          () => {}
        );
      } catch {
        setScanErr(
          "カメラを起動できませんでした。カメラの許可を確認するか、下にコードを貼り付けてね。"
        );
      }
    })();

    return () => {
      active = false;
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  function stopScanner() {
    const s = scannerRef.current;
    if (s) {
      scannerRef.current = null;
      s.stop()
        .then(() => s.clear())
        .catch(() => {});
    }
  }

  function startVsOpponent(o: OppData) {
    if (!monster) {
      return;
    }

    if (o.id === monster.id) {
      setScanErr("それは自分のQRだよ！相手のQRを読み取ってね。");
      setMode("menu");
      return;
    }

    const used = Number(localStorage.getItem(versusKey(monster.child_id, o.id)) || "0");
    if (used >= LIMIT_SAME) {
      setScanErr(`${o.name} とは 今日はもう ${LIMIT_SAME}回 対戦したよ！また明日ね。`);
      setMode("menu");
      return;
    }

    setOpp(o);
    setScanErr("");
    setStarted(false);
    setFinished(false);
    setResultText("");
    setPlayerHp(hpFromStamina(monster.stamina));
    setEnemyHp(hpFromStamina(o.stamina));
    setLog(`${o.name} と 対戦！（あと ${LIMIT_SAME - used} 回）`);
    setMode("battle");
  }

  function parsePayload(text: string): OppData | null {
    let d;
    try {
      d = JSON.parse(text);
    } catch {
      return null;
    }
    if (!d || d.v !== 1 || !d.id) {
      return null;
    }
    return {
      id: String(d.id),
      name: d.n || "フレンド",
      color: (d.c || "red") as EggColor,
      stage: d.s || "スタート期",
      power: Number(d.p) || 0,
      stamina: Number(d.st) || 0,
      speed: Number(d.sp) || 0,
      technique: Number(d.t) || 0,
      battlePower: Number(d.bp) || 0
    };
  }

  function onScan(text: string) {
    const o = parsePayload(text);
    if (!o) {
      return; // QRが読めても中身が違うものは無視して読み取り続行
    }
    stopScanner();
    startVsOpponent(o);
  }

  function onManual() {
    const o = parsePayload(manual.trim());
    if (!o) {
      setScanErr("コードが正しくありません。");
      return;
    }
    startVsOpponent(o);
  }

  function wait(ms: number) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function actPlayer(type: Anim["type"], expr: Anim["expr"]) {
    setPAnim((a) => ({ type, expr, k: a.k + 1 }));
  }

  function actOpponent(type: Anim["type"], expr: Anim["expr"]) {
    setOAnim((a) => ({ type, expr, k: a.k + 1 }));
  }

  async function startBattle() {
    if (!monster || !opp || started) {
      return;
    }

    setStarted(true);
    setLog("バトル開始！");

    let pHp = hpFromStamina(monster.stamina);
    let eHp = hpFromStamina(opp.stamina);

    const pStats = {
      power: Math.max(1, monster.power + 10),
      speed: monster.speed + 10,
      technique: monster.technique + 10
    };
    const eStats = {
      power: Math.max(1, opp.power + 10),
      speed: opp.speed + 10,
      technique: opp.technique + 10
    };

    while (pHp > 0 && eHp > 0) {
      const pa = calcDamage(pStats, { speed: eStats.speed });
      actPlayer("attack", pa.text.includes("クリティカル") ? "angry" : "normal");
      actOpponent(pa.damage === 0 ? "jump" : "idle", pa.damage === 0 ? "happy" : "normal");
      eHp -= pa.damage;
      setEnemyHp(Math.max(0, eHp));
      setLog(`${monster.name}の こうげき！${pa.text}`);
      await wait(900);

      if (eHp <= 0) {
        break;
      }

      const ea = calcDamage(eStats, { speed: pStats.speed });
      actOpponent("attack", ea.text.includes("クリティカル") ? "angry" : "normal");
      actPlayer(ea.damage === 0 ? "jump" : "idle", ea.damage === 0 ? "happy" : "normal");
      pHp -= ea.damage;
      setPlayerHp(Math.max(0, pHp));
      setLog(`${opp.name}の こうげき！${ea.text}`);
      await wait(900);
    }

    const isWin = pHp > 0;
    actPlayer(isWin ? "jump" : "idle", isWin ? "happy" : "sad");
    actOpponent(isWin ? "idle" : "jump", isWin ? "sad" : "happy");
    await finish(isWin);
  }

  async function finish(isWin: boolean) {
    if (!monster || !opp) {
      return;
    }

    const gained = isWin ? 10 : 3;
    const next = monster.battle_power + gained;

    // 戦闘力アップ（別枠：battlesテーブルには記録しないので1日10回制限に影響しない）
    const { error } = await supabase
      .from("monsters")
      .update({ battle_power: next })
      .eq("id", monster.id);

    if (error) {
      alert(error.message);
      return;
    }

    setMonster({ ...monster, battle_power: next });

    // 同じ相手との対戦回数を +1
    try {
      const k = versusKey(monster.child_id, opp.id);
      const used = Number(localStorage.getItem(k) || "0");
      localStorage.setItem(k, String(used + 1));
    } catch {
      // 無視
    }

    // オフライン対戦の累計を +1。10回ごとに「虹の種」を付与（オフラインのみ）
    try {
      const tk = versusTotalKey(monster.child_id);
      const total = Number(localStorage.getItem(tk) || "0") + 1;
      localStorage.setItem(tk, String(total));
      if (total % 10 === 0) {
        await addSeedToChild(monster.child_id, "rainbow", 1);
        setGotRainbow(true);
      }
    } catch {
      // 無視
    }

    setFinished(true);
    setResultText(
      isWin ? `勝利！ 戦闘力 +${gained}` : `負けても せいちょう！ 戦闘力 +${gained}`
    );
    setLog(isWin ? "バトルに かった！" : "つぎは かてるよ！");
  }

  if (!monster) {
    return (
      <main className="page">
        <div className="phone">
          <div className="header">友達と対戦</div>
          <div className="content">
            <div className="card">
              <div className="title">読み込み中…</div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const playerMaxHp = hpFromStamina(monster.stamina);
  const enemyMaxHp = opp ? hpFromStamina(opp.stamina) : 0;
  const usedToday = opp
    ? Number(localStorage.getItem(versusKey(monster.child_id, opp.id)) || "0")
    : 0;

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
        <div className="header">友達と対戦</div>

        <div className="content" style={{ paddingBottom: 92 }}>
          {mode === "menu" && (
            <>
              <div className="card" style={{ textAlign: "center" }}>
                <MonsterIcon
                  color={monster.egg_color}
                  size={110}
                  stage={monster.stage}
                  speed={monster.speed}
                  technique={monster.technique}
                />
                <div className="title" style={{ marginTop: 8 }}>
                  友達と オフライン対戦！
                </div>
                <div className="note">
                  自分のQRを 見せるか、相手のQRを カメラで読み取って 対戦しよう。
                  同じ相手とは 1日 3回まで。
                </div>
              </div>

              {scanErr && (
                <div
                  className="card"
                  style={{ background: "#ffe3e0", textAlign: "center" }}
                >
                  <div className="note" style={{ color: "#c0392b", fontSize: 15 }}>
                    {scanErr}
                  </div>
                </div>
              )}

              <button className="button red" onClick={() => setMode("scan")}>
                📷 相手のQRを 読み取る
              </button>

              <button className="button blue" onClick={() => setMode("show")}>
                🪪 自分のQRを 見せる
              </button>
            </>
          )}

          {mode === "show" && (
            <div className="card" style={{ textAlign: "center" }}>
              <div className="title">自分のQR</div>
              <div className="note">
                相手に 読み取ってもらおう！（{monster.name}）
              </div>
              <div
                style={{
                  display: "inline-block",
                  background: "white",
                  border: "5px solid #2b1b10",
                  borderRadius: 18,
                  padding: 10,
                  margin: "14px auto",
                  boxShadow: "0 5px 0 #2b1b10"
                }}
              >
                <canvas ref={myQrRef} />
              </div>
              <div className="note">
                戦闘力 {monster.battle_power} ・ {monster.stage}
              </div>
              <button className="button" onClick={() => setMode("menu")}>
                もどる
              </button>
            </div>
          )}

          {mode === "scan" && (
            <div className="card" style={{ textAlign: "center" }}>
              <div className="title">相手のQRを 読み取る</div>
              <div className="note">枠の中に 相手のQRを 入れてね。</div>

              <div
                id="reader"
                style={{
                  width: "100%",
                  maxWidth: 300,
                  margin: "14px auto",
                  borderRadius: 18,
                  overflow: "hidden",
                  border: "5px solid #2b1b10"
                }}
              />

              {scanErr && (
                <div className="note" style={{ color: "#c0392b", fontSize: 14 }}>
                  {scanErr}
                </div>
              )}

              <label className="label" style={{ marginTop: 8 }}>
                うまく読めないとき：コードを貼り付け
              </label>
              <input
                className="input"
                value={manual}
                onChange={(event) => setManual(event.target.value)}
                placeholder="相手のコード"
              />
              <button className="button blue" onClick={onManual}>
                このコードで 対戦
              </button>

              <button
                className="button"
                onClick={() => {
                  stopScanner();
                  setMode("menu");
                }}
              >
                やめる
              </button>
            </div>
          )}

          {mode === "battle" && opp && (
            <>
              <div className="card">
                <div className="title">{opp.name} と 対戦！</div>
                <div className="note">
                  この相手とは 今日 {usedToday} / {LIMIT_SAME} 回
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
                  <div
                    key={pAnim.k}
                    className={
                      pAnim.type === "attack"
                        ? "b-attack"
                        : pAnim.type === "jump"
                        ? "b-jump"
                        : ""
                    }
                    style={{ display: "inline-block" }}
                  >
                    <MonsterIcon
                      color={monster.egg_color}
                      size={100}
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
                    style={{ display: "inline-block" }}
                  >
                    <MonsterIcon
                      color={opp.color}
                      size={100}
                      expression={oAnim.expr}
                      stage={opp.stage}
                      speed={opp.speed}
                      technique={opp.technique}
                    />
                  </div>
                  <div style={{ fontWeight: 900, color: "#2b1b10" }}>
                    {opp.name}
                  </div>
                  <HpBar hp={enemyHp} max={enemyMaxHp} />
                </div>
              </div>

              <div className="card">
                <div
                  style={{
                    minHeight: 64,
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

              {!started && (
                <button className="button red" onClick={startBattle}>
                  バトル開始！
                </button>
              )}

              {finished && (
                <div className="card" style={{ textAlign: "center" }}>
                  <div className="title">{resultText}</div>
                  <div className="note">いまの戦闘力：{monster.battle_power}</div>
                  {(() => {
                    const total =
                      typeof window !== "undefined"
                        ? Number(
                            localStorage.getItem(
                              versusTotalKey(monster.child_id)
                            ) || "0"
                          )
                        : 0;
                    const g = total > 0 && total % 10 === 0 ? 10 : total % 10;
                    return (
                      <div style={{ marginTop: 10 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontWeight: 900,
                            fontSize: 13,
                            color: "#2b1b10",
                            marginBottom: 4
                          }}
                        >
                          <span>🌈 虹の種ゲージ</span>
                          <span>{g} / 10</span>
                        </div>
                        <div
                          style={{
                            height: 14,
                            borderRadius: 999,
                            border: "2px solid #2b1b10",
                            background: "#fff",
                            overflow: "hidden"
                          }}
                        >
                          <div
                            style={{
                              width: `${(g / 10) * 100}%`,
                              height: "100%",
                              background:
                                "linear-gradient(90deg,#ff3b3b,#ffb000,#39d353,#18a0fb,#a83dff)"
                            }}
                          />
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#7a6a55",
                            marginTop: 4
                          }}
                        >
                          {g >= 10
                            ? "🌈 虹の種を ゲット！"
                            : `あと ${10 - g} 回 オフライン対戦で 虹の種🌈`}
                        </div>
                      </div>
                    );
                  })()}
                  {gotRainbow && (
                    <div
                      style={{
                        marginTop: 8,
                        fontWeight: 900,
                        color: "#a83dff",
                        fontSize: 16
                      }}
                    >
                      🌈 10回 たいせん 達成！虹の種を ゲット！
                    </div>
                  )}
                </div>
              )}

              {finished && (
                <>
                  {usedToday < LIMIT_SAME && (
                    <button
                      className="button orange"
                      onClick={() => startVsOpponent(opp)}
                    >
                      🔁 もう一度（同じ相手）
                    </button>
                  )}
                  <button
                    className="button blue"
                    onClick={() => {
                      setOpp(null);
                      setMode("scan");
                    }}
                  >
                    👥 べつの相手と 対戦
                  </button>
                  <button
                    className="button"
                    onClick={() => router.push("/home")}
                  >
                    ホームへ戻る
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <BottomNav active="battle" />
    </main>
  );
}

function HpBar({ hp, max }: { hp: number; max: number }) {
  const percent = max > 0 ? Math.max(0, Math.round((hp / max) * 100)) : 0;
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
