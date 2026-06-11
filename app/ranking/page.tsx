"use client";

import BottomNav from "@/components/BottomNav";
import MonsterIcon from "@/components/MonsterIcon";
import { getMyActiveMonster, getMyChild } from "@/lib/game";
import { supabase } from "@/lib/supabaseClient";
import { EggColor } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type RankingRow = {
  id: string;
  name: string;
  egg_color: EggColor;
  stage: string;
  speed: number;
  technique: number;
  battle_power: number;
  child_id: string;
  children?: {
    name: string;
    classrooms?: {
      name: string;
    } | null;
  } | null;
};

export default function RankingPage() {
  const router = useRouter();

  const [rows, setRows] = useState<RankingRow[]>([]);
  const [myMonsterId, setMyMonsterId] = useState("");
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myBattlePower, setMyBattlePower] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRanking();
  }, []);

  async function loadRanking() {
    const myChild = await getMyChild();
    const myMonster = await getMyActiveMonster();

    if (!myChild || !myMonster) {
      router.push("/login");
      return;
    }

    setMyMonsterId(myMonster.id);
    setMyBattlePower(myMonster.battle_power);

    const { data, error } = await supabase
      .from("monsters")
      .select(
        `
        id,
        name,
        egg_color,
        stage,
        speed,
        technique,
        battle_power,
        child_id,
        children (
          name,
          classrooms (
            name
          )
        )
      `
      )
      .eq("is_active", true)
      .order("battle_power", { ascending: false })
      .limit(30);

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    const rankingRows = (data || []) as unknown as RankingRow[];
    setRows(rankingRows);

    const index = rankingRows.findIndex((row) => row.id === myMonster.id);
    setMyRank(index >= 0 ? index + 1 : null);
    setLoading(false);
  }

  if (loading) {
    return (
      <main className="page">
        <div className="phone">
          <div className="header">ランキング</div>
          <div className="content">
            <div className="card">
              <div className="title">読み込み中…</div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="phone">
        <div className="header">ランキング</div>

        <div className="content" style={{ paddingBottom: 92 }}>
          <div className="card" style={{ background: "#fff1cf", textAlign: "center" }}>
            <div className="note">あなたの現在順位</div>
            <div
              style={{
                fontSize: 46,
                fontWeight: 900,
                color: "#ff4b35",
                lineHeight: 1.1
              }}
            >
              {myRank ? `${myRank}位` : "圏外"}
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: "#2b1b10",
                marginTop: 6
              }}
            >
              戦闘力 {myBattlePower}
            </div>
          </div>

          <div
            style={{
              background: "#2b1b10",
              color: "white",
              borderRadius: 16,
              padding: 8,
              fontSize: 17,
              fontWeight: 900,
              textAlign: "center",
              marginBottom: 10
            }}
          >
            TOP 30
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {rows.map((row, index) => (
              <RankCard
                key={row.id}
                rank={index + 1}
                row={row}
                isMine={row.id === myMonsterId}
              />
            ))}

            {rows.length === 0 && (
              <div className="card">
                <div className="title">ランキングはまだありません</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNav active="ranking" />
    </main>
  );
}

function RankCard({
  rank,
  row,
  isMine
}: {
  rank: number;
  row: RankingRow;
  isMine: boolean;
}) {
  const classroomName = row.children?.classrooms?.name || "所属未設定";
  const childName = row.children?.name || "なまえ未設定";

  return (
    <div
      style={{
        background:
          rank === 1
            ? "#fff0aa"
            : rank === 2
            ? "#eeeeee"
            : rank === 3
            ? "#ffd4a8"
            : isMine
            ? "#ffe0a3"
            : "white",
        border: "4px solid #2b1b10",
        borderRadius: 20,
        padding: 10,
        boxShadow: "0 5px 0 #2b1b10",
        display: "grid",
        gridTemplateColumns: "44px 58px 1fr 74px",
        gap: 8,
        alignItems: "center",
        outline: isMine ? "4px solid #ff7a00" : "none"
      }}
    >
      <div
        style={{
          fontSize: 21,
          fontWeight: 900,
          color: "#2b1b10",
          textAlign: "center"
        }}
      >
        {rank}位
      </div>

      <div
        style={{
          width: 58,
          height: 58,
          background: "#fff1cf",
          border: "3px solid #2b1b10",
          borderRadius: 16,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <MonsterIcon
          color={row.egg_color}
          size={52}
          stage={row.stage}
          speed={row.speed}
          technique={row.technique}
        />
      </div>

      <div style={{ overflow: "hidden" }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 900,
            color: "#2b1b10",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis"
          }}
        >
          {row.name}
        </div>
        <div
          style={{
            marginTop: 3,
            fontSize: 12,
            fontWeight: 800,
            color: "#5a3218",
            lineHeight: 1.3
          }}
        >
          {classroomName}
          <br />
          {childName}
        </div>
      </div>

      <div
        style={{
          background: "#ff4b35",
          color: "white",
          border: "3px solid #2b1b10",
          borderRadius: 14,
          padding: "6px 4px",
          fontSize: 17,
          fontWeight: 900,
          textAlign: "center"
        }}
      >
        <span style={{ fontSize: 10, display: "block", lineHeight: 1 }}>
          戦闘力
        </span>
        {row.battle_power}
      </div>
    </div>
  );
}
