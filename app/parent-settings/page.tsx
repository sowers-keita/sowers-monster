"use client";

import { SeedType } from "@/lib/game";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ParentSettingsPage() {
  const router = useRouter();

  const [childId, setChildId] = useState("");
  const [missionTitle, setMissionTitle] = useState("靴をそろえる");
  const [missionDescription, setMissionDescription] =
    useState("今日、帰ってきたら靴をそろえよう。");
  const [rewardSeedType, setRewardSeedType] = useState<SeedType>("all");
  const [rewardAmount, setRewardAmount] = useState(1);
  const [pin, setPin] = useState("1234");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;

    if (!userId) {
      router.push("/login");
      return;
    }

    const { data: child } = await supabase
      .from("children")
      .select("id")
      .eq("parent_id", userId)
      .limit(1)
      .single();

    if (!child) {
      router.push("/register-child");
      return;
    }

    setChildId(child.id);

    const savedPin = localStorage.getItem("parentPin");

    if (savedPin) {
      setPin(savedPin);
    }
  }

  async function saveMission() {
    if (!childId) {
      return;
    }

    const today = new Date().toISOString().slice(0, 10);

    const { error } = await supabase.from("missions").insert({
      child_id: childId,
      mission_type: "parent",
      title: missionTitle,
      description: missionDescription,
      reward_seed_type: rewardSeedType,
      reward_amount: rewardAmount,
      mission_date: today
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("保護者ミッションを保存しました");
    router.push("/mission");
  }

  function savePin() {
    if (!/^[0-9]{4}$/.test(pin)) {
      alert("4桁の数字で入力してください");
      return;
    }

    localStorage.setItem("parentPin", pin);
    alert("暗証番号を保存しました");
  }

  return (
    <main className="page">
      <div className="phone">
        <div className="header">保護者設定</div>

        <div className="content">
          <div className="card">
            <div className="title">保護者ミッション設定</div>

            <label className="label">ミッション名</label>
            <input
              className="input"
              value={missionTitle}
              onChange={(event) => setMissionTitle(event.target.value)}
            />

            <label className="label">内容</label>
            <input
              className="input"
              value={missionDescription}
              onChange={(event) => setMissionDescription(event.target.value)}
            />

            <label className="label">報酬の種</label>
            <select
              className="input"
              value={rewardSeedType}
              onChange={(event) =>
                setRewardSeedType(event.target.value as SeedType)
              }
            >
              <option value="all">小さな万能の種</option>
              <option value="power">小さなパワーの種</option>
              <option value="stamina">小さなスタミナの種</option>
              <option value="speed">小さなスピードの種</option>
              <option value="technique">小さなテクニックの種</option>
            </select>

            <label className="label">報酬量</label>
            <input
              className="input"
              type="number"
              min={1}
              max={5}
              value={rewardAmount}
              onChange={(event) => setRewardAmount(Number(event.target.value))}
            />

            <button className="button blue" onClick={saveMission}>
              保存する
            </button>
          </div>

          <div className="card">
            <div className="title">保護者暗証番号</div>

            <label className="label">4桁の暗証番号</label>
            <input
              className="input"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              type="password"
              inputMode="numeric"
              maxLength={4}
            />

            <button className="button" onClick={savePin}>
              暗証番号を保存
            </button>

            <div className="note">
              子どもが勝手に達成できないよう、保護者承認時に使用します。
            </div>
          </div>

          <button className="button orange" onClick={() => router.push("/mission")}>
            ミッションへ戻る
          </button>
        </div>
      </div>
    </main>
  );
}
