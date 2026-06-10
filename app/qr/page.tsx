"use client";

import BottomNav from "@/components/BottomNav";
import {
  SeedType,
  addSeedToChild,
  getMyChild,
  seedLabels
} from "@/lib/game";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function QrPage() {
  const router = useRouter();

  const [qrText, setQrText] = useState("");
  const [result, setResult] = useState("");

  async function scan() {
    const child = await getMyChild();

    if (!child) {
      router.push("/login");
      return;
    }

    const parts = qrText.split("|");

    if (parts.length < 2 || parts[0] !== "SOWERS") {
      alert("QRコードが正しくありません");
      return;
    }

    const qrCodeId = parts[1];

    const { data: qrCode, error: qrError } = await supabase
      .from("qr_codes")
      .select("*")
      .eq("id", qrCodeId)
      .maybeSingle();

    if (qrError || !qrCode) {
      alert("QRコードが見つかりません");
      return;
    }

    if (qrCode.expires_at && new Date(qrCode.expires_at) < new Date()) {
      alert("このQRコードは期限切れです");
      return;
    }

    const { error: logError } = await supabase.from("qr_logs").insert({
      child_id: child.id,
      qr_code_id: qrCode.id
    });

    if (logError) {
      alert("このQRはすでに読み取り済みです");
      return;
    }

    await addSeedToChild(
      child.id,
      qrCode.seed_type as SeedType,
      qrCode.amount
    );

    setResult(
      `${seedLabels[qrCode.seed_type as SeedType]} +${qrCode.amount} を獲得しました！`
    );
  }

  function useTestQr() {
    alert(
      "本番では指導者用の /coach で発行されたQRコードを読み取ります。試作確認ではSupabaseにqr_codesが必要です。"
    );
  }

  return (
    <main className="page">
      <div className="phone">
        <div className="header">QR読み取り</div>

        <div className="content" style={{ paddingBottom: 92 }}>
          <div className="card">
            <div className="title">練習参加QR</div>
            <div className="note">
              指導者が発行したQRコードを読み取ると、種を獲得できます。
            </div>
          </div>

          <div
            style={{
              height: 270,
              background: "#1c1c1c",
              border: "5px solid #2b1b10",
              borderRadius: 28,
              boxShadow: "0 6px 0 #2b1b10",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color: "white",
              fontWeight: 900,
              textAlign: "center",
              lineHeight: 1.6,
              marginBottom: 14
            }}
          >
            <div
              style={{
                width: 180,
                height: 180,
                border: "6px solid #34b85a",
                borderRadius: 22,
                position: "absolute"
              }}
            />
            <div>
              QR読み取りエリア
              <br />
              正式版ではカメラ起動
            </div>
          </div>

          <div className="card">
            <label className="label">QRコード内容</label>
            <input
              className="input"
              value={qrText}
              onChange={(event) => setQrText(event.target.value)}
              placeholder="例：SOWERS|qr_code_id"
            />

            <button className="button" onClick={scan}>
              読み取る
            </button>

            <button className="button blue" onClick={useTestQr}>
              テスト説明
            </button>
          </div>

          {result && (
            <div className="card" style={{ textAlign: "center", background: "#fff1cf" }}>
              <div className="title">種を獲得！</div>
              <SeedIcon />
              <div className="note" style={{ fontSize: 18, color: "#2b1b10" }}>
                {result}
              </div>

              <button
                className="button"
                onClick={() => router.push("/inventory")}
              >
                持ち物を見る
              </button>
            </div>
          )}
        </div>
      </div>

      <BottomNav active="qr" />
    </main>
  );
}

function SeedIcon() {
  return (
    <div
      style={{
        width: 92,
        height: 112,
        border: "5px solid #2b1b10",
        borderRadius: "50% 50% 44% 44%",
        margin: "12px auto",
        position: "relative",
        boxShadow: "inset -12px -14px 0 rgba(0,0,0,0.15)",
        background: "linear-gradient(135deg, #ff3d25, #ff8a00)"
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 18,
          top: -9,
          width: 56,
          height: 28,
          background: "#54b83f",
          border: "4px solid #2b1b10",
          borderRadius: "50% 50% 35% 35%",
          transform: "rotate(-8deg)"
        }}
      />
    </div>
  );
}
