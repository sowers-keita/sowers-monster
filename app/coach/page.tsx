"use client";

import { SeedType, seedLabels } from "@/lib/game";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useRef, useState } from "react";

type Classroom = {
  id: string;
  name: string;
};

type RewardCode = {
  id: string;
  code: string;
  seed_type: SeedType;
  amount: number;
};

// 子どもが入力しやすい あいことば（ひらがな＋2桁）
const CODE_WORDS = [
  "そら",
  "うみ",
  "ほし",
  "にじ",
  "つき",
  "はな",
  "かぜ",
  "やま",
  "ゆき",
  "もり",
  "かわ",
  "たいよう",
  "ほのお",
  "かみなり",
  "つばさ",
  "ひかり"
];
const CODE_SEEDS: SeedType[] = ["power", "stamina", "speed", "technique"];

function makeCode() {
  const w = CODE_WORDS[Math.floor(Math.random() * CODE_WORDS.length)];
  const n = Math.floor(10 + Math.random() * 90);
  return `${w}${n}`;
}

function makeThreeCodes() {
  const used = new Set<string>();
  const out: { code: string; seed_type: SeedType; amount: number }[] = [];
  while (out.length < 3) {
    const code = makeCode();
    if (used.has(code)) {
      continue;
    }
    used.add(code);
    out.push({
      code,
      seed_type: CODE_SEEDS[Math.floor(Math.random() * CODE_SEEDS.length)],
      amount: 1 + Math.floor(Math.random() * 2)
    });
  }
  return out;
}

export default function CoachPage() {
  const [role, setRole] = useState("");
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [classroomId, setClassroomId] = useState("");
  const [seedType, setSeedType] = useState<SeedType>("power");
  const [amount, setAmount] = useState(3);
  const [qrText, setQrText] = useState("");
  const [codes, setCodes] = useState<RewardCode[]>([]);
  const [userId, setUserId] = useState("");
  const genRef = useRef(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: authData } = await supabase.auth.getUser();
    const uid = authData.user?.id;

    if (!uid) {
      return;
    }

    setUserId(uid);

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", uid)
      .maybeSingle();

    const r = profile?.role || "";
    setRole(r);

    const { data: classroomData } = await supabase
      .from("classrooms")
      .select("id, name")
      .order("name");

    const rows = (classroomData || []) as Classroom[];
    setClassrooms(rows);

    if (rows[0]) {
      setClassroomId(rows[0].id);
    }

    await loadCodes(r, uid);
  }

  // 今日の合言葉を読み込み。なければ自動で3つ生成する。
  async function loadCodes(r: string, uid: string) {
    const today = new Date().toISOString().slice(0, 10);

    const { data } = await supabase
      .from("reward_codes")
      .select("id, code, seed_type, amount")
      .eq("code_date", today)
      .order("created_at");

    let rows = (data || []) as RewardCode[];

    if (rows.length === 0 && (r === "coach" || r === "admin") && !genRef.current) {
      genRef.current = true;
      const three = makeThreeCodes();
      const { data: inserted } = await supabase
        .from("reward_codes")
        .insert(
          three.map((t) => ({
            ...t,
            code_date: today,
            created_by: uid
          }))
        )
        .select("id, code, seed_type, amount");
      rows = (inserted || []) as RewardCode[];
    }

    setCodes(rows);
  }

  async function makeCodesNow() {
    if (role !== "coach" && role !== "admin") {
      alert("指導者または管理者のみ作成できます");
      return;
    }
    genRef.current = false;
    await loadCodes(role, userId);
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
          <div className="card" style={{ background: "#fff7e6" }}>
            <div className="title">今日の あいことば（種がもらえる）</div>
            <div className="note">
              毎日 自動で 3つ できます。子どもに この あいことばを 伝えると、
              ミッション画面で 入力して 種を もらえます。
            </div>

            {codes.length === 0 ? (
              <button className="button orange" onClick={makeCodesNow}>
                今日の あいことばを 作る
              </button>
            ) : (
              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                {codes.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      background: "white",
                      border: "3px solid #2b1b10",
                      borderRadius: 14,
                      padding: 12,
                      textAlign: "center"
                    }}
                  >
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: 900,
                        color: "#2b1b10",
                        letterSpacing: 2
                      }}
                    >
                      {c.code}
                    </div>
                    <div className="note">
                      {seedLabels[c.seed_type]} +{c.amount}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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
