"use client";

import { SeedType, ymdLocal } from "@/lib/game";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ParentSettingsPage() {
  const router = useRouter();

  const [childId, setChildId] = useState("");
  const [userId, setUserId] = useState("");
  const [parentName, setParentName] = useState("");
  const [childName, setChildName] = useState("");
  const [savingNames, setSavingNames] = useState(false);
  const [missionTitle, setMissionTitle] = useState("靴をそろえる");
  const [missionDescription, setMissionDescription] =
    useState("今日、帰ってきたら靴をそろえよう。");
  const [rewardSeedType, setRewardSeedType] = useState<SeedType>("power");
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

    setUserId(userId);

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

    setChildId(child.id);
    setChildName(child.name || "");

    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", userId)
      .maybeSingle();

    setParentName(profile?.name || "");

    const savedPin = localStorage.getItem("parentPin");

    if (savedPin) {
      setPin(savedPin);
    }
  }

  async function saveNames() {
    if (savingNames) {
      return;
    }

    if (!parentName.trim() || !childName.trim()) {
      alert("保護者名と子どもの名前を入力してください");
      return;
    }

    setSavingNames(true);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ name: parentName.trim() })
      .eq("id", userId);

    const { error: childError } = await supabase
      .from("children")
      .update({ name: childName.trim() })
      .eq("id", childId);

    if (profileError || childError) {
      alert((profileError || childError)?.message);
      setSavingNames(false);
      return;
    }

    alert("名前を変更しました");
    setSavingNames(false);
  }

  async function resetAccount() {
    if (!childId) {
      return;
    }

    const ok = window.confirm(
      "いまのモンスターを 手ばなして、最初から やりなおします。\n（種もリセットされます。名前・ログインは そのまま）\nよろしいですか？"
    );
    if (!ok) {
      return;
    }

    // いまのモンスターを引退（is_active を false に）
    await supabase
      .from("monsters")
      .update({ is_active: false })
      .eq("child_id", childId)
      .eq("is_active", true);

    // 種を 0 に
    await supabase.from("seeds").update({ count: 0 }).eq("child_id", childId);

    // ミニゲームランキングの記録も消す（リセット）
    await supabase.from("game_scores").delete().eq("child_id", childId);

    // トレーニングの「きょうの種」記録を消す
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("swm_train_"))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      // 無視
    }

    alert("リセットしました。新しい卵を えらびましょう！");
    router.push("/egg-select");
  }

  async function saveMission() {
    if (!childId) {
      return;
    }

    const today = ymdLocal(new Date());

    // 今日の保護者ミッションは1つだけ。すでにあれば上書き、なければ新規。
    const { data: existing } = await supabase
      .from("missions")
      .select("id")
      .eq("child_id", childId)
      .eq("mission_type", "parent")
      .eq("mission_date", today)
      .order("id")
      .limit(1)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from("missions")
        .update({
          title: missionTitle,
          description: missionDescription,
          reward_seed_type: rewardSeedType,
          reward_amount: rewardAmount
        })
        .eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("missions").insert({
        child_id: childId,
        mission_type: "parent",
        title: missionTitle,
        description: missionDescription,
        reward_seed_type: rewardSeedType,
        reward_amount: rewardAmount,
        mission_date: today
      }));
    }

    if (error) {
      alert(error.message);
      return;
    }

    alert("今日の おうちミッションを 保存しました（1日1つ）");
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
            <div className="title">おうちミッション設定</div>

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

          <div className="card">
            <div className="title">なまえの変更</div>

            <label className="label">保護者の名前</label>
            <input
              className="input"
              value={parentName}
              onChange={(event) => setParentName(event.target.value)}
              maxLength={20}
            />

            <label className="label">子どもの名前</label>
            <input
              className="input"
              value={childName}
              onChange={(event) => setChildName(event.target.value)}
              maxLength={20}
            />

            <button
              className="button"
              onClick={saveNames}
              disabled={savingNames}
            >
              {savingNames ? "保存中…" : "名前を保存"}
            </button>
          </div>

          <div className="card">
            <div className="title">最初からやりなおす</div>
            <div className="note" style={{ marginBottom: 8 }}>
              いまのモンスターを 手ばなして、新しい卵から はじめます。種もリセットされます（名前・ログインは そのまま）。
            </div>
            <button className="button red" onClick={resetAccount}>
              最初から はじめる
            </button>
          </div>

          <button className="button orange" onClick={() => router.push("/mission")}>
            ミッションへ戻る
          </button>
        </div>
      </div>
    </main>
  );
}
