"use client";

import Phone from "@/components/Phone";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function login() {
    if (!email || !password) {
      alert("メールアドレスとパスワードを入力してください");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/home");
  }

  // パスワードを忘れたとき：メールアドレスに再設定リンクを送る
  async function forgot() {
    if (!email) {
      setMsg("先に メールアドレスを 入力してください。");
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
      "パスワード再設定メールを送りました。メール内のリンクを開いて、新しいパスワードを決めてください。（届くまで数分かかることがあります。迷惑メールもご確認ください）"
    );
  }

  return (
    <Phone title="Sowers Monster">
      <div className="card">
        <div className="title">保護者ログイン</div>

        <label className="label">メールアドレス</label>
        <input
          className="input"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="mail@example.com"
        />

        <label className="label">パスワード</label>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="パスワード"
        />

        <button className="button" onClick={login}>
          ログイン
        </button>

        <button
          className="button gray"
          style={{ marginTop: 8 }}
          onClick={forgot}
          disabled={busy}
        >
          {busy ? "送信中…" : "パスワードを忘れた方はこちら"}
        </button>

        {msg && (
          <div
            style={{
              marginTop: 10,
              background: "white",
              border: "3px solid #2b1b10",
              borderRadius: 14,
              padding: 10,
              fontSize: 13.5,
              fontWeight: 700,
              color: "#2b1b10",
              lineHeight: 1.7
            }}
          >
            {msg}
          </div>
        )}

        <button
          className="button orange"
          style={{ marginTop: 14 }}
          onClick={() => router.push("/register-child")}
        >
          はじめての方はこちら
        </button>

        <button
          className="button gray"
          onClick={() => router.push("/switch")}
        >
          【スマホ共有】アカウント切り替え
        </button>

        <div className="note">
          Supabase Authのメール＋パスワードでログインします。
        </div>
      </div>
    </Phone>
  );
}
