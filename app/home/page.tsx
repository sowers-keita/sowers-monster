"use client";

import BottomNav from "@/components/BottomNav";
import MonsterIcon from "@/components/MonsterIcon";
import { supabase } from "@/lib/supabaseClient";
import { EggColor } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type HomeMonster = {
  id: string;
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
};

// 進化のしくみ：4つの能力の合計が一定値に達すると次の段階へ
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

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function HomePage() {
  const router = useRouter();

  const [monster, setMonster] = useState<HomeMonster | null>(null);
  const [childName, setChildName] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [happy, setHappy] = useState(false);
  const [evolving, setEvolving] = useState<"none" | "glow" | "done">("none");

  useEffect(() => {
    loadHome();
  }, []);

  // ジャンプのタイミングで、ときどき「喜ぶ顔」に
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

    setMonster(activeMonster as HomeMonster);
    setLoading(false);
  }

  async function saveName() {
    if (!monster || savingName) {
      return;
    }

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

  async function evolve() {
    if (!monster || evolving !== "none") {
      return;
    }

    const ns = NEXT_STAGE[monster.stage];
    if (!ns) {
      return;
    }

    // 光って進化演出
    setEvolving("glow");
    await sleep(1300);

    const { error } = await supabase
      .from("monsters")
      .update({ stage: ns })
      .eq("id", monster.id);

    if (error) {
      alert(error.message);
      setEvolving("none");
      return;
    }

    setMonster({ ...monster, stage: ns });
    setEvolving("done");
  }

  if (loading) {
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

  if (!monster) {
    return null;
  }

  const total =
    monster.power + monster.stamina + monster.speed + monster.technique;
  const threshold = EVO_THRESHOLD[monster.stage];
  const canEvolve = threshold !== undefined && total >= threshold;
  const evoRemain =
    threshold !== undefined ? Math.max(0, threshold - total) : 0;
  const isMaxStage = NEXT_STAGE[monster.stage] === undefined;

  return (
    <main className="page">
      <style>{`
@keyframes evo-glow{0%{filter:brightness(1);transform:scale(1);}45%{filter:brightness(3.5);transform:scale(1.18);}100%{filter:brightness(1.4);transform:scale(1.05);}}
.evo-glow{animation:evo-glow 1.3s ease-in-out forwards;}
@keyframes evo-pop{0%{transform:scale(.4);opacity:0;}60%{transform:scale(1.12);opacity:1;}100%{transform:scale(1);}}
.evo-pop{animation:evo-pop .5s ease-out;}
@keyframes evo-pulse{0%,100%{transform:scale(1);}50%{transform:scale(1.05);}}
.evo-ready{animation:evo-pulse 1s ease-in-out infinite;}
`}</style>
      <div className="phone">
        <div className="header">Sowers Monster</div>

        <div className="content" style={{ paddingBottom: 92 }}>
          <div className="card" style={{ textAlign: "center", background: "#fff1cf" }}>
            <div className="monster-stage">
              {/* 背景：雲・山・うっすら海・草原 */}
              <div className="scene-cloud" style={{ top: 14, left: 28 }} />
              <div className="scene-cloud" style={{ top: 26, right: 30, width: 50 }} />
              <div className="scene-mountain left" />
              <div className="scene-mountain mid" />
              <div className="scene-mountain right" />
              <div className="scene-grass" />

              <div className="monster-walker">
                <div className="monster-hopper">
                  <MonsterIcon
                    color={monster.egg_color}
                    size={130}
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
              <div style={{ marginTop: 10 }}>
                <div className="title" style={{ margin: 0 }}>
                  {monster.name}
                </div>
                <button
                  onClick={() => {
                    setNameInput(monster.name);
                    setEditingName(true);
                  }}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#9a8266",
                    fontSize: 12,
                    fontWeight: 700,
                    textDecoration: "underline",
                    padding: "2px 4px",
                    marginTop: 2,
                    cursor: "pointer"
                  }}
                >
                  なまえを変更
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

            <div
              style={{
                display: "inline-block",
                marginTop: 8,
                background: "#ff7a00",
                color: "white",
                border: "3px solid #2b1b10",
                borderRadius: 999,
                padding: "6px 14px",
                fontWeight: 900
              }}
            >
              {monster.stage}
            </div>

            <div className="note">{childName}さんのモンスター</div>
          </div>

          {/* 進化 */}
          {canEvolve && (
            <button
              className="button evo-ready"
              onClick={evolve}
              style={{
                background: "linear-gradient(90deg,#ffce3a,#ff9d00)",
                color: "#2b1b10",
                fontSize: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 12
              }}
            >
              <span style={{ fontSize: 36 }} aria-hidden>
                ✨
              </span>
              しんかする！
            </button>
          )}

          {!canEvolve && !isMaxStage && (
            <div
              className="card"
              style={{ textAlign: "center", background: "#fff8e6" }}
            >
              <div style={{ fontWeight: 900, color: "#2b1b10" }}>
                あと <span style={{ color: "#ff7a00" }}>{evoRemain}</span>{" "}
                つよくすると しんか！
              </div>
              <div className="note" style={{ marginTop: 4 }}>
                トレーニングで パワー・スタミナ・スピード・テクニックを そだてよう
              </div>
            </div>
          )}

          {isMaxStage && (
            <div
              className="card"
              style={{ textAlign: "center", background: "#fff8e6" }}
            >
              <div style={{ fontWeight: 900, color: "#2b1b10" }}>
                ✨ さいごの すがた ✨
              </div>
            </div>
          )}

          <div className="card">
            <div className="title">ステータス</div>

            <Status
              label="パワー"
              current={monster.power}
              max={monster.power_max}
              color="#ff4b35"
            />

            <Status
              label="スタミナ"
              current={monster.stamina}
              max={monster.stamina_max}
              color="#34b85a"
            />

            <Status
              label="スピード"
              current={monster.speed}
              max={monster.speed_max}
              color="#2f8ee5"
            />

            <Status
              label="テクニック"
              current={monster.technique}
              max={monster.technique_max}
              color="#9b51e0"
            />
          </div>

          <div className="card">
            <div className="title">バトル情報</div>

            <div
              style={{
                background: "#fff1cf",
                border: "3px solid #2b1b10",
                borderRadius: 16,
                padding: 14,
                textAlign: "center",
                fontWeight: 900
              }}
            >
              戦闘力
              <div style={{ fontSize: 34, color: "#ff4b35" }}>
                {monster.battle_power}
              </div>
            </div>
          </div>

          <MenuButton
            className="button"
            icon="🎯"
            label="ミッション"
            onClick={() => router.push("/mission")}
          />
          <MenuButton
            className="button orange"
            icon="💪"
            label="トレーニング"
            onClick={() => router.push("/training")}
          />
          <MenuButton
            className="button red"
            icon="⚔️"
            label="バトル"
            onClick={() => router.push("/battle")}
          />
          <MenuButton
            className="button blue"
            icon="🎒"
            label="もちもの"
            onClick={() => router.push("/inventory")}
          />
          <MenuButton
            className="button orange"
            icon="📖"
            label="ずかん"
            onClick={() => router.push("/zukan")}
          />
        </div>
      </div>

      {/* 進化アニメーションのオーバーレイ */}
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

// 文字が苦手な子でも分かるよう、大きな絵アイコン付きのボタン
function MenuButton({
  className,
  icon,
  label,
  onClick
}: {
  className: string;
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={className}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        minHeight: 70,
        fontSize: 24
      }}
    >
      <span style={{ fontSize: 40, lineHeight: 1 }} aria-hidden>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

function Status({
  label,
  current,
  max,
  color
}: {
  label: string;
  current: number;
  max: number;
  color: string;
}) {
  const percent = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;

  return (
    <div className="status-row">
      <div className="status-label">
        <span style={{ color }}>{label}</span>
        <span>
          {current} / {max}
        </span>
      </div>

      <div className="status-bar">
        <div
          className="status-fill"
          style={{ width: `${percent}%`, background: color }}
        />
      </div>
    </div>
  );
}
