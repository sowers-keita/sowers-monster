"use client";

import { SeedType, seedLabels } from "@/lib/game";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";

type Classroom = {
  id: string;
  name: string;
};

export default function CoachPage() {
  const [role, setRole] = useState("");
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [classroomId, setClassroomId] = useState("");
  const [seedType, setSeedType] = useState<SeedType>("power");
  const [amount, setAmount] = useState(3);
  const [qrText, setQrText] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;

    if (!userId) {
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    setRole(profile?.role || "");

    const { data: classroomData } = await supabase
      .from("classrooms")
      .select("id, name")
      .order("name");

    const rows = (classroomData || []) as Classroom[];
    setClassrooms(rows);

    if (rows[0]) {
      setClassroomId(rows[0].id);
    }
  }

  async function createQr() {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;

    if (!userId) {
      alert("ログインしてください");
      return;
    }

    if (role !== "coach" && role !== "admin") {
      alert("指導者または管理者のみQRを発行できます");
      return;
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 3);

    const { data, error } = await supabase
      .from("qr_codes")
      .insert({
        coach_id: userId,
        classroom_id: classroomId,
        seed_type: seedType,
        amount,
        expires_at: expiresAt.toISOString()
      })
      .select("id")
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setQrText(`SOWERS|${data.id}`);
  }

  return (
    <main className="page">
      <div className="phone">
        <div className="header">指導者QR発行</div>

        <div className="content">
          <div className="card">
            <div className="title">練習参加QR</div>
            <div className="note">
              この画面は通常アプリからリンクしません。指導者専用URLです。
            </div>

            <label className="label">教室・会場</label>
            <select
              className="input"
              value={classroomId}
              onChange={(event) => setClassroomId(event.target.value)}
            >
              {classrooms.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>
                  {classroom.name}
                </option>
              ))}
            </select>

            <label className="label">配布する種</label>
            <select
              className="input"
              value={seedType}
              onChange={(event) => setSeedType(event.target.value as SeedType)}
            >
              <option value="power">パワーの種</option>
              <option value="stamina">スタミナの種</option>
              <option value="speed">スピードの種</option>
              <option value="technique">テクニックの種</option>
              <option value="all">万能の種</option>
              <option value="rainbow">虹の種</option>
            </select>

            <label className="label">個数・上昇量</label>
            <input
              className="input"
              type="number"
              min={1}
              max={10}
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value))}
            />

            <button className="button blue" onClick={createQr}>
              QRを発行する
            </button>
          </div>

          {qrText && (
            <div className="card" style={{ textAlign: "center" }}>
              <div className="title">参加者に見せるQR</div>
              <FakeQr />
              <div
                style={{
                  background: "#fffaf0",
                  border: "3px solid #2b1b10",
                  borderRadius: 14,
                  padding: 10,
                  fontSize: 13,
                  fontWeight: 900,
                  color: "#2b1b10",
                  wordBreak: "break-all",
                  lineHeight: 1.5
                }}
              >
                {qrText}
              </div>
              <div className="note">
                種：{seedLabels[seedType]} +{amount}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function FakeQr() {
  return (
    <div
      style={{
        width: 220,
        height: 220,
        margin: "10px auto",
        background:
          "linear-gradient(90deg, #111 10px, transparent 10px) 0 0/22px 22px, linear-gradient(#111 10px, transparent 10px) 0 0/22px 22px, #fff",
        border: "8px solid #111",
        position: "relative"
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 12,
          top: 12,
          width: 58,
          height: 58,
          background: "white",
          border: "12px solid #111"
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 12,
          top: 12,
          width: 58,
          height: 58,
          background: "white",
          border: "12px solid #111"
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 12,
          bottom: 12,
          width: 58,
          height: 58,
          background: "white",
          border: "12px solid #111"
        }}
      />
    </div>
  );
}
