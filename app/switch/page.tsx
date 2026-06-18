"use client";

import Phone from "@/components/Phone";
import { supabase } from "@/lib/supabaseClient";
import { getMyChild } from "@/lib/game";
import {
  SavedAccount,
  getAccounts,
  hashPin,
  isSaved,
  removeAccount,
  updateAccountTokens,
  upsertAccount
} from "@/lib/accounts";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SwitchPage() {
  const router = useRouter();

  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [curId, setCurId] = useState("");
  const [curEmail, setCurEmail] = useState("");
  const [curLabel, setCurLabel] = useState("");
  const [curSaved, setCurSaved] = useState(false);

  // 切り替え用
  const [sel, setSel] = useState<SavedAccount | null>(null);
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // 登録用
  const [regPin, setRegPin] = useState("");
  const [regPin2, setRegPin2] = useState("");
  const [regMsg, setRegMsg] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setAccounts(getAccounts());
    const { data: u } = await supabase.auth.getUser();
    if (u.user) {
      setCurId(u.user.id);
      setCurEmail(u.user.email || "");
      setCurSaved(isSaved(u.user.id));
      const child = await getMyChild();
      setCurLabel(child?.name || u.user.email || "アカウント");
    }
  }

  // 今ログイン中のアカウントをこの端末に登録（PIN設定）
  async function registerCurrent() {
    if (regPin.length !== 4 || !/^\d{4}$/.test(regPin)) {
      setRegMsg("4桁の数字でPINを決めてください");
      return;
    }
    if (regPin !== regPin2) {
      setRegMsg("PINが一致しません");
      return;
    }
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setRegMsg("ログイン情報が取得できませんでした");
      return;
    }
    upsertAccount({
      id: curId,
      label: curLabel,
      email: curEmail,
      pinHash: await hashPin(regPin),
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      updatedAt: Date.now()
    });
    setRegPin("");
    setRegPin2("");
    setRegMsg("");
    load();
  }

  async function doSwitch() {
    if (!sel) return;
    if (pin.length < 4) {
      setMsg("4桁のPINを入力してください");
      return;
    }
    if ((await hashPin(pin)) !== sel.pinHash) {
      setMsg("PINが ちがうみたい。");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.setSession({
      access_token: sel.accessToken,
      refresh_token: sel.refreshToken
    });
    if (error || !data.session) {
      setBusy(false);
      setMsg(
        "このアカウントのログイン有効期限が切れています。パスワードで ログインし直してください。"
      );
      return;
    }
    updateAccountTokens(
      sel.id,
      data.session.access_token,
      data.session.refresh_token
    );
    router.push("/home");
  }

  const others = accounts.filter((a) => a.id !== curId);

  return (
    <Phone title="アカウント切り替え">
      <div className="card">
        <div className="title">いま ログイン中</div>
        <div className="note" style={{ marginBottom: 8 }}>
          {curLabel}（{curEmail}）
        </div>

        {curSaved ? (
          <div className="note">この端末に登録ずみです。</div>
        ) : (
          <>
            <div className="note" style={{ marginBottom: 6 }}>
              この端末に登録すると、つぎから PIN で すぐに 切り替えられます。
            </div>
            <label className="label">切り替え用PIN（4桁）</label>
            <input
              className="input"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={regPin}
              onChange={(e) => setRegPin(e.target.value)}
            />
            <label className="label">もう一度</label>
            <input
              className="input"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={regPin2}
              onChange={(e) => setRegPin2(e.target.value)}
            />
            {regMsg && (
              <div style={{ color: "#c0392b", fontWeight: 900, marginTop: 6 }}>
                {regMsg}
              </div>
            )}
            <button className="button" onClick={registerCurrent}>
              この端末に登録する
            </button>
          </>
        )}
      </div>

      <div className="card">
        <div className="title">ほかの アカウントに 切り替え</div>
        {others.length === 0 ? (
          <div className="note">
            まだ ほかの アカウントは 登録されていません。
          </div>
        ) : (
          others.map((a) => (
            <div
              key={a.id}
              style={{
                border: "3px solid #2b1b10",
                borderRadius: 14,
                padding: 10,
                marginBottom: 10,
                background: sel?.id === a.id ? "#fff1cf" : "white"
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div style={{ fontWeight: 900 }}>{a.label}</div>
                <button
                  className="button sm"
                  style={{ width: "auto", marginTop: 0, padding: "4px 12px" }}
                  onClick={() => {
                    setSel(a);
                    setPin("");
                    setMsg("");
                  }}
                >
                  切り替え
                </button>
              </div>

              {sel?.id === a.id && (
                <div style={{ marginTop: 8 }}>
                  <label className="label">{a.label} のPIN（4桁）</label>
                  <input
                    className="input"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                  />
                  {msg && (
                    <div
                      style={{
                        color: "#c0392b",
                        fontWeight: 900,
                        margin: "6px 0"
                      }}
                    >
                      {msg}
                    </div>
                  )}
                  <button
                    className="button blue"
                    onClick={doSwitch}
                    disabled={busy}
                  >
                    {busy ? "切り替え中…" : "このアカウントに 入る"}
                  </button>
                  <button
                    className="button gray"
                    style={{ marginTop: 6 }}
                    onClick={() => {
                      if (confirm(a.label + " をこの端末から消しますか？")) {
                        removeAccount(a.id);
                        setSel(null);
                        setAccounts(getAccounts());
                      }
                    }}
                  >
                    この端末から削除
                  </button>
                </div>
              )}
            </div>
          ))
        )}

        <button
          className="button orange"
          onClick={() => router.push("/login")}
        >
          ＋ 別のアカウントで ログイン
        </button>
      </div>

      <button className="button gray" onClick={() => router.push("/home")}>
        ← ホームに もどる
      </button>
    </Phone>
  );
}
