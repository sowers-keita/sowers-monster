"use client";

import Phone from "@/components/Phone";
import { getParentPin, setParentPin } from "@/lib/pin";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SetupPinPage() {
  const router = useRouter();

  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    check();
  }, []);

  async function check() {
    // 設定済み（2人目の登録など）なら、そのまま卵選びへ
    const saved = await getParentPin();
    if (saved) {
      router.replace("/egg-select");
      return;
    }
    setChecking(false);
  }

  async function save() {
    if (busy) {
      return;
    }
    if (!/^[0-9]{4}$/.test(pin)) {
      setMsg("4桁の数字で 決めてください");
      return;
    }
    if (pin !== pin2) {
      setMsg("2回とも 同じ番号を 入力してください");
      return;
    }

    setBusy(true);
    setMsg("");
    const ok = await setParentPin(pin);
    setBusy(false);

    if (!ok) {
      setMsg("保存に失敗しました。もう一度お試しください");
      return;
    }

    router.push("/egg-select");
  }

  return (
    <Phone title="保護者暗証番号">
      <div className="card">
        <div className="title">保護者の暗証番号を決めてください</div>

        <div className="note" style={{ textAlign: "left" }}>
          ミッションの達成確認や おうちミッションの設定は、保護者の方だけができます。
          お子さんに知られない4桁の数字を決めてください。
          （あとで「保護者設定」から変更できます）
        </div>

        {checking ? (
          <div className="note">確認中…</div>
        ) : (
          <>
            <label className="label">暗証番号（4桁）</label>
            <input
              className="input"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(event) => setPin(event.target.value)}
            />

            <label className="label">もう一度</label>
            <input
              className="input"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin2}
              onChange={(event) => setPin2(event.target.value)}
            />

            {msg && (
              <div
                style={{
                  marginTop: 10,
                  color: "#c0392b",
                  fontWeight: 900,
                  textAlign: "center"
                }}
              >
                {msg}
              </div>
            )}

            <button className="button" onClick={save} disabled={busy}>
              {busy ? "保存中…" : "決めて 卵をえらぶへ"}
            </button>
          </>
        )}
      </div>
    </Phone>
  );
}
