"use client";

import BottomNav from "@/components/BottomNav";
import MonsterIcon from "@/components/MonsterIcon";
import {
  GameRankRow,
  GameType,
  gameLabels,
  gameScoreUnit,
  getGameRanking,
  getMyActiveMonster,
  getMyChild,
  mondayStart,
  seedLabels,
  gameSeed,
  ymdLocal
} from "@/lib/game";
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

type Mode = "power" | GameType;

const GAME_ORDER: GameType[] = [
  "friend",
  "running",
  "stop",
  "thread",
  "stopwatch",
  "number"
];

export default function RankingPage() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("power");
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [gameRows, setGameRows] = useState<GameRankRow[]>([]);
  const [gameLoading, setGameLoading] = useState(false);
  const [myMonsterId, setMyMonsterId] = useState("");
  const [myChildId, setMyChildId] = useState("");
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myBattlePower, setMyBattlePower] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRanking();
  }, []);

  useEffect(() => {
    if (mode === "power") {
      return;
    }
    loadGameRanking(mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  async function loadRanking() {
    const myChild = await getMyChild();
    const myMonster = await getMyActiveMonster();

    if (!myChild || !myMonster) {
      router.push("/login");
      return;
    }

    setMyMonsterId(myMonster.id);
    setMyChildId(myChild.id);
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

    // 1人(子)につき1表示にするため、child_idで重複排除（先頭=最高戦闘力を採用）
    const allRows = (data || []) as unknown as RankingRow[];
    const seenChild = new Set<string>();
    const rankingRows = allRows.filter((row) => {
      if (!row.child_id) return true;
      if (seenChild.has(row.child_id)) return false;
      seenChild.add(row.child_id);
      return true;
    });
    // 自分の順位は10位圏外でも正しく出すため、全体(重複排除後)から算出
    const index = rankingRows.findIndex((row) => row.id === myMonster.id);
    setMyRank(index >= 0 ? index + 1 : null);

    // 表示は戦闘力トップ10まで
    setRows(rankingRows.slice(0, 10));
    setLoading(false);
  }

  async function loadGameRanking(game: GameType) {
    setGameLoading(true);
    const ws = ymdLocal(mondayStart());
    const data = await getGameRanking(game, ws, 30);
    setGameRows(data);
    setGameLoading(false);
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
          {/* 切り替えタブ */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 6,
              marginBottom: 12
            }}
          >
            <Tab label="戦闘力" active={mode === "power"} onClick={() => setMode("power")} />
            {GAME_ORDER.map((g) => (
              <Tab
                key={g}
                label={gameLabels[g]}
                active={mode === g}
                onClick={() => setMode(g)}
              />
            ))}
          </div>

          {mode === "power" ? (
            <>
              <div
                className="card"
                style={{ background: "#fff1cf", textAlign: "center" }}
              >
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
                TOP 10
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
            </>
          ) : (
            <GameRanking
              game={mode}
              rows={gameRows}
              loading={gameLoading}
              myChildId={myChildId}
            />
          )}
        </div>
      </div>

      <BottomNav active="ranking" />
    </main>
  );
}

function Tab({
  label,
  active,
  onClick
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 42,
        border: "3px solid #2b1b10",
        borderRadius: 12,
        background: active ? "#ffd447" : "white",
        color: "#2b1b10",
        fontSize: 10.5,
        fontWeight: 900,
        boxShadow: "0 3px 0 #2b1b10",
        padding: 0,
        whiteSpace: "nowrap",
        letterSpacing: "-0.5px"
      }}
    >
      {label}
    </button>
  );
}

function GameRanking({
  game,
  rows,
  loading,
  myChildId
}: {
  game: GameType;
  rows: GameRankRow[];
  loading: boolean;
  myChildId: string;
}) {
  return (
    <>
      <div className="card" style={{ background: "#e9f4ff", textAlign: "center" }}>
        <div className="title">{gameLabels[game]} 今週のランキング</div>
        <div className="note">
          月〜日のベストスコアで競争！ 上位3人は {seedLabels[gameSeed[game]]}{" "}
          を1こ ゲット（来週うけとり）。
        </div>
      </div>

      {loading ? (
        <div className="card">
          <div className="title">読み込み中…</div>
        </div>
      ) : rows.length === 0 ? (
        <div className="card">
          <div className="title">まだ記録がありません</div>
          <div className="note">トレーニングで挑戦すると ここに のります！</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {rows.map((row, index) => {
            const rank = index + 1;
            const isMine = row.child_id === myChildId;
            const isTop3 = rank <= 3;
            return (
              <div
                key={`${row.child_id}-${index}`}
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
                  borderRadius: 18,
                  padding: 12,
                  boxShadow: "0 5px 0 #2b1b10",
                  display: "grid",
                  gridTemplateColumns: "50px 1fr auto",
                  gap: 10,
                  alignItems: "center",
                  outline: isMine ? "4px solid #ff7a00" : "none"
                }}
              >
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 900,
                    color: "#2b1b10",
                    textAlign: "center"
                  }}
                >
                  {rank}位{isTop3 ? "🌱" : ""}
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
                    {row.child_name}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#5a3218" }}>
                    {row.classroom}
                  </div>
                </div>
                <div
                  style={{
                    background: "#2f8ee5",
                    color: "white",
                    border: "3px solid #2b1b10",
                    borderRadius: 14,
                    padding: "6px 10px",
                    fontSize: 16,
                    fontWeight: 900,
                    whiteSpace: "nowrap"
                  }}
                >
                  {game === "number"
                    ? `${(20000 / row.score).toFixed(2)}秒`
                    : game === "stopwatch"
                    ? `${(row.score / 10000).toFixed(4)}秒`
                    : `${row.score}${gameScoreUnit[game]}`}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
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
