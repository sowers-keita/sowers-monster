"use client";

import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    // メールのリンクを開くと、supabase クライアントが URL のトークンから
    // 自動でセッションを作る。PASSWORD_RECOVERY イベント or 既存セッションで判定。
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setHasSession(true);
        setReady(true);
      }
    });

    // 少し待ってからセッションを確認（URL 解析が終わるのを待つ）
    const timer = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      setHasSession(!!data.session);
      setReady(true);
    }, 1200);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function save() {
    if (pw1.length < 6) {
      setMsg("パスワードは6文字以上で決めてください");
      return;
    }

    if (pw1 !== pw2) {
      setMsg("確認用のパスワードが一致しません");
      return;
    }

    setBusy(true);
    setMsg("");

    const { error } = await supabase.auth.updateUser({ password: pw1 });

    setBusy(false);

    if (error) {
      setMsg("変更できませんでした：" + error.message);
      return;
    }

    setDone(true);
    setMsg("");
    setTimeout(() => router.push("/login"), 1500);
  }

  if (!ready) {
    return (
      <main className="page">
        <div className="phone">
          <div className="header">パスワード設定</div>
          <div className="content">
            <div className="card">
              <div className="title">確認中…</div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (done) {
    return (
      <main className="page">
        <div className="phone">
          <div className="header">パスワード設定</div>
          <div className="content">
            <div className="card">
              <div className="title">設定しました！</div>
              <div className="note">
                新しいパスワードを保存しました。スタッフメニューに移動します…
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!hasSession) {
    return (
      <main className="page">
        <div className="phone">
          <div className="header">パスワード設定</div>
          <div className="content">
            <div className="card">
              <div className="title">リンクが無効です</div>
              <div className="note" style={{ lineHeight: 1.7 }}>
                このページは、パスワード設定メールのリンクから開いてください。
                リンクの有効期限が切れている場合は、ログイン画面の「パスワードを忘れた
                / 初めて設定する」からもう一度メールを送ってください。
              </div>
              <button
                className="button"
                onClick={() => router.push("/staff")}
                style={{ marginTop: 10 }}
              >
                スタッフログインへ
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
        <div className="header">パスワード設定</div>

        <div className="content">
          <div className="card">
            <div className="title">新しいパスワードを決める</div>
            <div className="note" style={{ marginBottom: 8 }}>
              6文字以上で、わすれないパスワードを決めてください。
            </div>

            <label className="label">新しいパスワード</label>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              value={pw1}
              onChange={(event) => setPw1(event.target.value)}
              placeholder="6文字以上"
            />

            <label className="label">もう一度入力</label>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              value={pw2}
              onChange={(event) => setPw2(event.target.value)}
              placeholder="確認のためもう一度"
            />

            {msg && (
              <div
                className="note"
                style={{
                  marginTop: 8,
                  color: "#9a3412",
                  fontWeight: 700,
                  lineHeight: 1.6
                }}
              >
                {msg}
              </div>
            )}

            <button
              className="button"
              onClick={save}
              disabled={busy}
              style={{ marginTop: 10 }}
            >
              {busy ? "保存中…" : "このパスワードにする"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
