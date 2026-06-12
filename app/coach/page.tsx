"use client";

import StaffLogin from "@/components/StaffLogin";
import { SeedType, seedLabels } from "@/lib/game";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";

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
function makeCode() {
  const w = CODE_WORDS[Math.floor(Math.random() * CODE_WORDS.length)];
  const n = Math.floor(10 + Math.random() * 90);
  return `${w}${n}`;
}

export default function CoachPage() {
  const [role, setRole] = useState("");
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [classroomId, setClassroomId] = useState("");
  const [seedType, setSeedType] = useState<SeedType>("power");
  const [amount, setAmount] = useState(3);
  const [qrText, setQrText] = useState("");
  const [codes, setCodes] = useState<RewardCode[]>([]);
  const [codeSeedType, setCodeSeedType] = useState<SeedType>("power");
  const [codeAmount, setCodeAmount] = useState(1);
  const [codeText, setCodeText] = useState(() => makeCode());
  const [userId, setUserId] = useState("");
  const [checked, setChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  async function load() {
    const { data: authData } = await supabase.auth.getUser();
    const uid = authData.user?.id;

    if (!uid) {
      setLoggedIn(false);
      setChecked(true);
      return;
    }

    setLoggedIn(true);
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
    setChecked(true);
  }

  // 今日の合言葉を読み込み（自動生成はしない。種類は指導者が選んで作る）
  async function loadCodes(_r: string, _uid: string) {
    const today = new Date().toISOString().slice(0, 10);

    const { data } = await supabase
      .from("reward_codes")
      .select("id, code, seed_type, amount")
      .eq("code_date", today)
      .order("created_at");

    setCodes((data || []) as RewardCode[]);
  }

  // 指導者が「種の種類」と「上昇量」を選んで、あいことばを1つ作る
  async function createCode() {
    if (role !== "coach" && role !== "admin") {
      alert("指導者または管理者のみ作成できます");
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const code = codeText.trim() || makeCode();

    const { data: inserted, error } = await supabase
      .from("reward_codes")
      .insert({
        code,
        seed_type: codeSeedType,
        amount: codeAmount,
        code_date: today,
        created_by: userId
      })
      .select("id, code, seed_type, amount")
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setCodes((prev) => [...prev, inserted as RewardCode]);
    // 次の入力用に新しいランダム候補をセット
    setCodeText(makeCode());
  }

  async function deleteCode(id: string) {
    if (role !== "coach" && role !== "admin") {
      return;
    }

    const ok = window.confirm("この あいことばを 消しますか？");
    if (!ok) {
      return;
    }

    const { error } = await supabase.from("reward_codes").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setCodes((prev) => prev.filter((c) => c.id !== id));
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

  if (!checked) {
    return (
      <main className="page">
        <div className="phone">
          <div className="header">指導者ページ</div>
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
        title="指導者 ログイン"
        note="指導者のメールアドレスとパスワードでログインしてください。"
      />
    );
  }

  if (role !== "coach" && role !== "admin") {
    return (
      <main className="page">
        <div className="phone">
          <div className="header">指導者ページ</div>
          <div className="content">
            <div className="card">
              <div className="title">アクセスできません</div>
              <div className="note">
                この画面は指導者・管理者専用です。今ログイン中のアカウントには権限がありません。
              </div>
              <button
                className="button orange"
                onClick={logout}
                style={{ marginTop: 10 }}
              >
                ログアウトして別のアカウントで入る
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
        <div className="header">指導者QR発行</div>

        <div className="content">
          <div className="card" style={{ background: "#fff7e6" }}>
            <div className="title">今日の あいことば（種がもらえる）</div>
            <div className="note">
              あいことばと「種の種類・量」を自分で決めて作れます。子どもに この
              あいことばを 伝えると、ミッション画面で 入力して 種を もらえます。
            </div>

            <label className="label">あいことば（変更できます）</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="input"
                value={codeText}
                onChange={(event) => setCodeText(event.target.value)}
                placeholder="例：そら12"
                style={{ flex: 1 }}
              />
              <button
                className="button"
                onClick={() => setCodeText(makeCode())}
                style={{ width: "auto", padding: "0 14px", whiteSpace: "nowrap" }}
              >
                ランダム
              </button>
            </div>

            <label className="label">種の種類</label>
            <select
              className="input"
              value={codeSeedType}
              onChange={(event) =>
                setCodeSeedType(event.target.value as SeedType)
              }
            >
              <option value="power">パワーの種</option>
              <option value="stamina">スタミナの種</option>
              <option value="speed">スピードの種</option>
              <option value="technique">テクニックの種</option>
              <option value="all">万能の種</option>
              <option value="rainbow">虹の種</option>
            </select>

            <label className="label">上昇量</label>
            <input
              className="input"
              type="number"
              min={1}
              max={10}
              value={codeAmount}
              onChange={(event) => setCodeAmount(Number(event.target.value))}
            />

            <button className="button orange" onClick={createCode}>
              この あいことばを 作る
            </button>

            {codes.length > 0 && (
              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                <div className="note">今日 作った あいことば</div>
                {codes.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      background: "white",
                      border: "3px solid #2b1b10",
                      borderRadius: 14,
                      padding: 12,
                      textAlign: "center",
                      position: "relative"
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
                    <button
                      onClick={() => deleteCode(c.id)}
                      style={{
                        position: "absolute",
                        top: 6,
                        right: 8,
                        background: "transparent",
                        border: "none",
                        color: "#b91c1c",
                        fontWeight: 900,
                        fontSize: 13,
                        cursor: "pointer"
                      }}
                    >
                      けす
                    </button>
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
