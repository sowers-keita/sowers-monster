"use client";

import StaffLogin from "@/components/StaffLogin";
import { SeedType } from "@/lib/game";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";

export default function AdminSowersPage() {
  const [role, setRole] = useState("");
  const [checked, setChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  const [missionTitle, setMissionTitle] =
    useState("片足立ち30秒チャレンジ");
  const [missionDescription, setMissionDescription] =
    useState("おうちで片足立ちに挑戦しよう。ふらついてもOK！");
  const [rewardSeedType, setRewardSeedType] = useState<SeedType>("speed");
  const [rewardAmount, setRewardAmount] = useState(1);
  const [missionDate, setMissionDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [seasonName, setSeasonName] = useState("2026 春シーズン");
  const [seasonTheme, setSeasonTheme] = useState("動物系");
  const [seasonStart, setSeasonStart] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [seasonEnd, setSeasonEnd] = useState("");

  useEffect(() => {
    checkRole();
  }, []);

  async function checkRole() {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;

    if (!userId) {
      setLoggedIn(false);
      setChecked(true);
      return;
    }

    setLoggedIn(true);

    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    setRole(data?.role || "");
    setChecked(true);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  async function saveHqMission() {
    if (role !== "admin") {
      alert("管理者のみ実行できます");
      return;
    }

    const { data: profile } = await supabase.auth.getUser();

    const { error } = await supabase.from("missions").insert({
      created_by: profile.user?.id,
      mission_type: "hq",
      title: missionTitle,
      description: missionDescription,
      reward_seed_type: rewardSeedType,
      reward_amount: rewardAmount,
      mission_date: missionDate
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("本部ミッションを保存しました");
  }

  async function saveSeason() {
    if (role !== "admin") {
      alert("管理者のみ実行できます");
      return;
    }

    if (!seasonEnd) {
      alert("終了日を入力してください");
      return;
    }

    const { error } = await supabase.from("seasons").insert({
      name: seasonName,
      theme: seasonTheme,
      start_date: seasonStart,
      end_date: seasonEnd,
      is_active: true
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("シーズンを作成しました");
  }

  if (!checked) {
    return (
      <main className="page">
        <div className="phone">
          <div className="header">Sowers本部管理</div>
          <div className="content">
            <div className="card">
              <div className="title">確認中…</div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!loggedIn) {
    return (
      <StaffLogin
        title="本部管理 ログイン"
        note="本部管理者のメールアドレスとパスワードでログインしてください。"
      />
    );
  }

  if (role !== "admin") {
    return (
      <main className="page">
        <div className="phone">
          <div className="header">Sowers本部管理</div>
          <div className="content">
            <div className="card">
              <div className="title">アクセスできません</div>
              <div className="note">
                この画面は本部管理者専用です。今ログイン中のアカウントには管理者権限がありません。
              </div>
              <button
                className="button orange"
                onClick={logout}
                style={{ marginTop: 10 }}
              >
                ログアウトして別のアカウントで入る
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="phone">
        <div className="header">Sowers本部管理</div>

        <div className="content">
          <div className="card">
            <div className="title">本部ミッション作成</div>

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
              <option value="power">パワーの種</option>
              <option value="stamina">スタミナの種</option>
              <option value="speed">スピードの種</option>
              <option value="technique">テクニックの種</option>
              <option value="all">万能の種</option>
              <option value="rainbow">虹の種</option>
            </select>

            <label className="label">報酬量</label>
            <input
              className="input"
              type="number"
              min={1}
              max={10}
              value={rewardAmount}
              onChange={(event) => setRewardAmount(Number(event.target.value))}
            />

            <label className="label">配信日</label>
            <input
              className="input"
              type="date"
              value={missionDate}
              onChange={(event) => setMissionDate(event.target.value)}
            />

            <button className="button" onClick={saveHqMission}>
              本部ミッションを保存
            </button>
          </div>

          <div className="card">
            <div className="title">シーズン作成</div>

            <label className="label">シーズン名</label>
            <input
              className="input"
              value={seasonName}
              onChange={(event) => setSeasonName(event.target.value)}
            />

            <label className="label">テーマ</label>
            <input
              className="input"
              value={seasonTheme}
              onChange={(event) => setSeasonTheme(event.target.value)}
            />

            <label className="label">開始日</label>
            <input
              className="input"
              type="date"
              value={seasonStart}
              onChange={(event) => setSeasonStart(event.target.value)}
            />

            <label className="label">終了日</label>
            <input
              className="input"
              type="date"
              value={seasonEnd}
              onChange={(event) => setSeasonEnd(event.target.value)}
            />

            <button className="button orange" onClick={saveSeason}>
              シーズンを作成
            </button>
          </div>

          <div className="card">
            <div className="title">管理方針</div>
            <div className="note">
              この画面は完全別URLです。通常アプリ・保護者画面・生徒画面からはリンクしません。
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
