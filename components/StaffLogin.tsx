"use client";

import { supabase } from "@/lib/supabaseClient";
import { useState } from "react";

type Props = {
  title?: string;
  note?: string;
};

export default function StaffLogin({
  title = "スタッフ ログイン",
  note = "管理者・指導者の方は、メールアドレスとパスワードでログインしてください。"
}: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [forgotMode, setForgotMode] = useState(false);

  async function login() {
    if (!email || !password) {
      setMsg("メールアドレスとパスワードを入力してください");
      return;
    }

    setBusy(true);
    setMsg("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    setBusy(false);

    if (error) {
      setMsg("ログインできませんでした。メールアドレスとパスワードをご確認ください。");
      return;
    }

    // ログイン成功 → ページを読み込み直して権限チェックを反映
    window.location.reload();
  }

  async function sendReset() {
    if (!email) {
      setMsg("先にメールアドレスを入力してください");
      return;
    }

    setBusy(true);
    setMsg("");

    const redirectTo =
      (typeof window !== "undefined" ? window.location.origin : "") +
      "/reset-password";

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo
    });

    setBusy(false);

    if (error) {
      setMsg("メールを送信できませんでした：" + error.message);
      return;
    }

    setMsg(
      "パスワード設定メールを送りました。メール内のリンクを開いて、新しいパスワードを決めてください。（届くまで数分かかることがあります）"
    );
  }

  return (
    <main className="page">
      <div className="phone">
        <div className="header">{title}</div>

        <div className="content">
          <div className="card">
            <div className="title">{forgotMode ? "パスワードを設定する" : "ログイン"}</div>
            <div className="note" style={{ marginBottom: 8 }}>
              {forgotMode
                ? "登録したメールアドレスを入力して「設定メールを送る」を押してください。届いたメールのリンクから新しいパスワードを決められます。"
                : note}
            </div>

            <label className="label">メールアドレス</label>
            <input
              className="input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="mail@example.com"
            />

            {!forgotMode && (
              <>
                <label className="label">パスワード</label>
                <input
                  className="input"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="パスワード"
                />
              </>
            )}

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

            {!forgotMode ? (
              <>
                <button
                  className="button"
                  onClick={login}
                  disabled={busy}
                  style={{ marginTop: 10 }}
                >
                  {busy ? "確認中…" : "ログイン"}
                </button>
                <button
                  className="button orange"
                  onClick={() => {
                    setMsg("");
                    setForgotMode(true);
                  }}
                  disabled={busy}
                >
                  パスワードを忘れた / 初めて設定する
                </button>
              </>
            ) : (
              <>
                <button
                  className="button blue"
                  onClick={sendReset}
                  disabled={busy}
                  style={{ marginTop: 10 }}
                >
                  {busy ? "送信中…" : "設定メールを送る"}
                </button>
                <button
                  className="button"
                  onClick={() => {
                    setMsg("");
                    setForgotMode(false);
                  }}
                  disabled={busy}
                >
                  ログインに戻る
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
