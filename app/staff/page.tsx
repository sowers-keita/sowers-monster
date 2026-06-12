"use client";

import StaffLogin from "@/components/StaffLogin";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function StaffPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    check();
  }, []);

  async function check() {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;

    if (!uid) {
      setChecked(true);
      return;
    }

    setLoggedIn(true);
    setEmail(data.user?.email || "");

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", uid)
      .maybeSingle();

    setRole(profile?.role || "");
    setChecked(true);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  if (!checked) {
    return (
      <main className="page">
        <div className="phone">
          <div className="header">スタッフ メニュー</div>
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
        title="スタッフ ログイン"
        note="管理者・指導者の方は、メールアドレスとパスワードでログインしてください。"
      />
    );
  }

  const isAdmin = role === "admin";
  const isCoach = role === "coach" || role === "admin";

  return (
    <main className="page">
      <div className="phone">
        <div className="header">スタッフ メニュー</div>

        <div className="content">
          <div className="card">
            <div className="title">ようこそ</div>
            <div className="note">{email}</div>
            <div className="note" style={{ marginTop: 4 }}>
              権限：
              {role === "admin"
                ? "管理者"
                : role === "coach"
                ? "指導者"
                : "（管理者・指導者の権限がありません）"}
            </div>
          </div>

          {isAdmin && (
            <button
              className="button"
              onClick={() => router.push("/admin-sowers")}
            >
              本部管理ページへ
            </button>
          )}

          {isCoach && (
            <button className="button blue" onClick={() => router.push("/coach")}>
              指導者ページ（あいことば・QR）へ
            </button>
          )}

          {!isAdmin && !isCoach && (
            <div className="card">
              <div className="note">
                このアカウントには管理者・指導者の権限が設定されていません。権限付与が必要な場合は本部にご連絡ください。
              </div>
            </div>
          )}

          <button className="button orange" onClick={logout}>
            ログアウト
          </button>
        </div>
      </div>
    </main>
  );
}
