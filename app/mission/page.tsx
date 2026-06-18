"use client";

import BottomNav from "@/components/BottomNav";
import {
  SeedType,
  addSeedToChild,
  getMyChild,
  seedLabels,
  ymdLocal
} from "@/lib/game";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Mission = {
  id: string;
  child_id: string | null;
  mission_type: "hq" | "parent";
  title: string;
  description: string | null;
  reward_seed_type: SeedType;
  reward_amount: number;
  mission_date: string;
};

type MissionLog = {
  mission_id: string;
};

export default function MissionPage() {
  const router = useRouter();

  const [childId, setChildId] = useState("");
  const [missions, setMissions] = useState<Mission[]>([]);
  const [logs, setLogs] = useState<MissionLog[]>([]);
  const [pin, setPin] = useState("");
  const [selectedParentMissionId, setSelectedParentMissionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [codeInput, setCodeInput] = useState("");
  const [codeMsg, setCodeMsg] = useState("");
  const [codeBusy, setCodeBusy] = useState(false);
  const [pinGate, setPinGate] = useState<"none" | "enter" | "set">("none");
  const [gatePin, setGatePin] = useState("");
  const [gatePin2, setGatePin2] = useState("");
  const [gateMsg, setGateMsg] = useState("");

  useEffect(() => {
    loadMissions();
  }, []);

  async function loadMissions() {
    const child = await getMyChild();

    if (!child) {
      router.push("/login");
      return;
    }

    setChildId(child.id);

    const today = ymdLocal(new Date());

    const { data: missionData, error: missionError } = await supabase
      .from("missions")
      .select("*")
      .or(`mission_type.eq.hq,child_id.eq.${child.id}`)
      .eq("mission_date", today)
      .order("mission_type");

    if (missionError) {
      alert(missionError.message);
      setLoading(false);
      return;
    }

    const { data: logData, error: logError } = await supabase
      .from("mission_logs")
      .select("mission_id")
      .eq("child_id", child.id);

    if (logError) {
      alert(logError.message);
      setLoading(false);
      return;
    }

    setMissions((missionData || []) as Mission[]);
    setLogs((logData || []) as MissionLog[]);
    setLoading(false);
  }

  function isDone(missionId: string) {
    return logs.some((log) => log.mission_id === missionId);
  }

  async function completeMission(mission: Mission) {
    if (!childId || isDone(mission.id)) {
      return;
    }

    const { error: logError } = await supabase.from("mission_logs").insert({
      child_id: childId,
      mission_id: mission.id
    });

    if (logError) {
      alert(logError.message);
      return;
    }

    await addSeedToChild(
      childId,
      mission.reward_seed_type,
      mission.reward_amount
    );

    alert(`${seedLabels[mission.reward_seed_type]} +${mission.reward_amount} を獲得しました！`);
    await loadMissions();
  }

  async function redeemCode() {
    if (codeBusy) {
      return;
    }

    const word = codeInput.trim();
    if (!word) {
      setCodeMsg("あいことばを 入力してね。");
      return;
    }

    if (!childId) {
      return;
    }

    setCodeBusy(true);
    setCodeMsg("");

    const today = new Date().toISOString().slice(0, 10);

    // 合言葉を探す（発行から3ヶ月以内なら有効）
    const { data: codes, error: codeError } = await supabase
      .from("reward_codes")
      .select("id, seed_type, amount, created_at")
      .eq("code", word)
      .order("created_at", { ascending: false })
      .limit(1);

    if (codeError) {
      setCodeMsg(codeError.message);
      setCodeBusy(false);
      return;
    }

    const code = codes && codes[0];
    if (!code) {
      setCodeMsg("あいことばが ちがうみたい。もういちど かくにんしてね。");
      setCodeBusy(false);
      return;
    }

    // 有効期限（発行から3ヶ月）
    const expLimit = new Date();
    expLimit.setMonth(expLimit.getMonth() - 3);
    if (code.created_at && new Date(code.created_at) < expLimit) {
      setCodeMsg("この あいことばは 期限が切れています（発行から3ヶ月まで）。");
      setCodeBusy(false);
      return;
    }

    // すでに使っていないか（1人1回）。先にログを入れて重複を防止する。
    const { error: logError } = await supabase
      .from("reward_code_logs")
      .insert({ child_id: childId, reward_code_id: code.id });

    if (logError) {
      setCodeMsg("この あいことばは もう つかったよ。");
      setCodeBusy(false);
      return;
    }

    try {
      await addSeedToChild(childId, code.seed_type as SeedType, code.amount);
      setCodeMsg(
        `🌱 ${seedLabels[code.seed_type as SeedType]} +${code.amount} を ゲット！`
      );
      setCodeInput("");
    } catch (e) {
      // 種付与に失敗したら、先に入れたログを取り消して再挑戦できるようにする
      // （これをしないと「もう つかった」状態で種が永久にもらえなくなる）
      await supabase
        .from("reward_code_logs")
        .delete()
        .eq("child_id", childId)
        .eq("reward_code_id", code.id);
      setCodeMsg(
        "種の付与に失敗しました。通信を確認して もう一度お試しください。"
      );
    }

    setCodeBusy(false);
  }

  // 設定画面（おうちミッション）へは暗証番号が必要
  function openSettings() {
    setGatePin("");
    setGatePin2("");
    setGateMsg("");
    const saved = localStorage.getItem("parentPin");
    setPinGate(saved ? "enter" : "set"); // 初回は設定、以降は入力
  }

  function submitGateEnter() {
    const saved = localStorage.getItem("parentPin") || "1234";
    if (gatePin !== saved) {
      setGateMsg("暗証番号が ちがいます");
      return;
    }
    setPinGate("none");
    router.push("/parent-settings");
  }

  function submitGateSet() {
    if (!/^[0-9]{4}$/.test(gatePin)) {
      setGateMsg("4桁の数字で 決めてね");
      return;
    }
    if (gatePin !== gatePin2) {
      setGateMsg("2回とも 同じ番号を 入力してね");
      return;
    }
    localStorage.setItem("parentPin", gatePin);
    setPinGate("none");
    router.push("/parent-settings");
  }

  async function approveParentMission(mission: Mission) {
    const savedPin = localStorage.getItem("parentPin") || "1234";

    if (pin !== savedPin) {
      alert("暗証番号が違います");
      return;
    }

    setSelectedParentMissionId("");
    setPin("");
    await completeMission(mission);
  }

  if (loading) {
    return (
      <main className="page">
        <div className="phone">
          <div className="header">ミッション</div>
          <div className="content">
            <div className="card">
              <div className="title">読み込み中…</div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const hqMissions = missions.filter((mission) => mission.mission_type === "hq");
  // 保護者ミッションは1日1つだけ表示
  const parentMissions = missions
    .filter((mission) => mission.mission_type === "parent")
    .slice(0, 1);

  return (
    <main className="page">
      <div className="phone">
        <div className="header">ミッション</div>

        <div className="content" style={{ paddingBottom: 92 }}>
          <div className="card">
            <div className="title">今日のミッション</div>
            <div className="note">
              メインミッションとおうちミッションは、それぞれ1日1回達成できます。
            </div>
          </div>

          <div className="card" style={{ background: "#fff7e6" }}>
            <div className="title">あいことばで 種ゲット</div>
            <div className="note">
              先生から おしえてもらった 今日の あいことばを 入力すると 種が
              もらえるよ！（1つにつき 1回まで）
            </div>

            <input
              className="input"
              value={codeInput}
              onChange={(event) => setCodeInput(event.target.value)}
              placeholder="あいことばを 入力"
            />

            <button className="button orange" onClick={redeemCode} disabled={codeBusy}>
              {codeBusy ? "かくにん中…" : "あいことばを つかう"}
            </button>

            {codeMsg && (
              <div
                style={{
                  marginTop: 10,
                  background: "white",
                  border: "3px solid #2b1b10",
                  borderRadius: 14,
                  padding: 10,
                  fontSize: 15,
                  fontWeight: 900,
                  color: "#2b1b10",
                  textAlign: "center"
                }}
              >
                {codeMsg}
              </div>
            )}
          </div>

          {hqMissions.length === 0 && (
            <div className="card">
              <div className="title">メインミッションなし</div>
              <div className="note">今日は メインミッションが ありません。</div>
            </div>
          )}

          {hqMissions.map((mission) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              done={isDone(mission.id)}
              label="メインミッション"
              onComplete={() => completeMission(mission)}
            />
          ))}

          {parentMissions.length === 0 && (
            <div className="card">
              <div className="title">おうちミッションなし</div>
              <div className="note">
                おうちの人が、下の「おうちミッションを設定する」から
                今日のミッションを 作れます。
              </div>
            </div>
          )}

          {parentMissions.map((mission) => (
            <div key={mission.id}>
              <MissionCard
                mission={mission}
                done={isDone(mission.id)}
                label="おうちミッション"
                onComplete={() => setSelectedParentMissionId(mission.id)}
              />

              {selectedParentMissionId === mission.id && !isDone(mission.id) && (
                <div className="card">
                  <div className="title">おうちの人の承認</div>

                  <label className="label">暗証番号</label>
                  <input
                    className="input"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pin}
                    onChange={(event) => setPin(event.target.value)}
                  />

                  <button
                    className="button blue"
                    onClick={() => approveParentMission(mission)}
                  >
                    承認する
                  </button>
                </div>
              )}
            </div>
          ))}

          <button className="button orange" onClick={openSettings}>
            🔒 おうちミッションを設定する
          </button>
        </div>
      </div>

      {/* 暗証番号ゲート（おうちの人だけが設定画面に入れる） */}
      {pinGate !== "none" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "rgba(18,10,28,0.86)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 22
          }}
        >
          <div
            className="card"
            style={{ width: "100%", maxWidth: 340, marginBottom: 0 }}
          >
            <div className="title">
              {pinGate === "set" ? "暗証番号を きめよう" : "おうちの人 かくにん"}
            </div>
            <div className="note" style={{ textAlign: "left" }}>
              {pinGate === "set"
                ? "暗証番号は、子どもが かってに ミッションを 作れないように、おうちの人だけが 設定画面に 入るための ものです。4桁の数字を 決めてください。"
                : "おうちミッションの設定は、おうちの人だけが できます。暗証番号を 入力してください。"}
            </div>

            <label className="label">暗証番号（4桁）</label>
            <input
              className="input"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={gatePin}
              onChange={(event) => setGatePin(event.target.value)}
            />

            {pinGate === "set" && (
              <>
                <label className="label">もう一度</label>
                <input
                  className="input"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={gatePin2}
                  onChange={(event) => setGatePin2(event.target.value)}
                />
              </>
            )}

            {gateMsg && (
              <div
                style={{
                  marginTop: 10,
                  color: "#c0392b",
                  fontWeight: 900,
                  textAlign: "center"
                }}
              >
                {gateMsg}
              </div>
            )}

            <button
              className="button blue"
              onClick={pinGate === "set" ? submitGateSet : submitGateEnter}
            >
              {pinGate === "set" ? "決めて すすむ" : "ひらく"}
            </button>
            <button
              className="button gray"
              onClick={() => setPinGate("none")}
            >
              やめる
            </button>
          </div>
        </div>
      )}

      <BottomNav active="mission" />
    </main>
  );
}

function MissionCard({
  mission,
  done,
  label,
  onComplete
}: {
  mission: Mission;
  done: boolean;
  label: string;
  onComplete: () => void;
}) {
  return (
    <div
      className="card"
      style={{
        background: done ? "#e4f8df" : "white"
      }}
    >
      <div
        style={{
          display: "inline-block",
          border: "3px solid #2b1b10",
          borderRadius: 999,
          padding: "4px 10px",
          fontSize: 13,
          fontWeight: 900,
          color: "white",
          background: mission.mission_type === "hq" ? "#34b85a" : "#2f8ee5",
          marginBottom: 8
        }}
      >
        {label}
      </div>

      <div className="title" style={{ textAlign: "left" }}>
        {mission.title}
      </div>

      <div className="note" style={{ textAlign: "left" }}>
        {mission.description || "説明はありません。"}
      </div>

      <div
        style={{
          marginTop: 10,
          background: "#fff1cf",
          border: "3px solid #2b1b10",
          borderRadius: 16,
          padding: 8,
          fontSize: 15,
          fontWeight: 900,
          color: "#2b1b10"
        }}
      >
        報酬：{seedLabels[mission.reward_seed_type]} +{mission.reward_amount}
      </div>

      <button
        className={`button ${mission.mission_type === "hq" ? "" : "blue"}`}
        onClick={onComplete}
        disabled={done}
      >
        {done ? "本日達成済み" : "達成した！"}
      </button>
    </div>
  );
}
