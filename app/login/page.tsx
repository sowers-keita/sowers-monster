"use client";

import Phone from "@/components/Phone";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
          className="button orange"
          onClick={() => router.push("/register-child")}
        >
          はじめての方はこちら
        </button>

        <div className="note">
          Supabase Authのメール＋パスワードでログインします。
        </div>
      </div>
    </Phone>
  );
}
