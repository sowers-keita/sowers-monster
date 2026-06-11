"use client";

import BottomNav from "@/components/BottomNav";
import {
  SeedType,
  addSeedToChild,
  getMyChild,
  seedLabels
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

    const today = new Date().toISOString().slice(0, 10);

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

    // 今日の合言葉を探す
    const { data: codes, error: codeError } = await supabase
      .from("reward_codes")
      .select("id, seed_type, amount")
      .eq("code", word)
      .eq("code_date", today)
      .limit(1);

    if (codeError) {
      setCodeMsg(codeError.message);
      setCodeBusy(false);
      return;
    }

    const code = codes && codes[0];
    if (!code) {
      setCodeMsg("あいことばが ちがうみたい。今日のものか かくにんしてね。");
      setCodeBusy(false);
      return;
    }

    // すでに使っていないか（1人1回）
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
      setCodeMsg(e instanceof Error ? e.message : "種の付与に失敗しました");
    }

    setCodeBusy(false);
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
              本部ミッションと保護者ミッションは、それぞれ1日1回達成できます。
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
              <div className="title">本部ミッションなし</div>
              <div className="note">今日は本部からのミッションがありません。</div>
            </div>
          )}

          {hqMissions.map((mission) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              done={isDone(mission.id)}
              label="本部ミッション"
              onComplete={() => completeMission(mission)}
            />
          ))}

          {parentMissions.length === 0 && (
            <div className="card">
              <div className="title">保護者ミッションなし</div>
              <div className="note">
                保護者設定画面から、今日のミッションを設定できます。
              </div>
              <button
                className="button blue"
                onClick={() => router.push("/parent-settings")}
              >
                保護者設定へ
              </button>
            </div>
          )}

          {parentMissions.map((mission) => (
            <div key={mission.id}>
              <MissionCard
                mission={mission}
                done={isDone(mission.id)}
                label="保護者ミッション"
                onComplete={() => setSelectedParentMissionId(mission.id)}
              />

              {selectedParentMissionId === mission.id && !isDone(mission.id) && (
                <div className="card">
                  <div className="title">保護者承認</div>

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

          <button
            className="button orange"
            onClick={() => router.push("/parent-settings")}
          >
            保護者ミッションを設定する
          </button>
        </div>
      </div>

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
