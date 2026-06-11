"use client";

import BottomNav from "@/components/BottomNav";
import MonsterIcon from "@/components/MonsterIcon";
import { getMyChild } from "@/lib/game";
import { supabase } from "@/lib/supabaseClient";
import { EggColor } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ZukanMaster = {
  no: number;
  name: string;
  stage: string;
  type: string;
  eggColor: EggColor;
  memo: string;
};

type ZukanRecord = {
  id: string;
  monster_name: string;
  monster_type: string;
  stage: string;
};

const zukanMaster: ZukanMaster[] = [
  { no: 1, name: "モンキー", stage: "スタート期", type: "サル系", eggColor: "red", memo: "赤い卵から生まれた元気なサル。" },
  { no: 2, name: "モンバディ", stage: "ビギナー期", type: "サル系", eggColor: "red", memo: "少し成長して動きが素早くなった。" },
  { no: 3, name: "ゴリパン", stage: "ヒーロー期", type: "サル系", eggColor: "red", memo: "パワー型に進化した力自慢。" },
  { no: 4, name: "ニンモン", stage: "ヒーロー期", type: "サル系", eggColor: "red", memo: "スピード型のサルモンスター。" },
  { no: 5, name: "キングゴリパン", stage: "覚醒期", type: "サル系", eggColor: "red", memo: "圧倒的なパワーを持つ覚醒体。" },
  { no: 6, name: "シノビモン", stage: "覚醒期", type: "サル系", eggColor: "red", memo: "影のように動く覚醒体。" },

  { no: 7, name: "ワンちゃん", stage: "スタート期", type: "犬系", eggColor: "blue", memo: "青い卵から生まれた子犬。" },
  { no: 8, name: "ワンダー", stage: "ビギナー期", type: "犬系", eggColor: "blue", memo: "好奇心いっぱいの犬モンスター。" },
  { no: 9, name: "ガーディアン", stage: "ヒーロー期", type: "犬系", eggColor: "blue", memo: "仲間を守るスタミナ型。" },
  { no: 10, name: "シャドウハウンド", stage: "ヒーロー期", type: "犬系", eggColor: "blue", memo: "四足歩行のテクニック型。" },
  { no: 11, name: "セントガーディアン", stage: "覚醒期", type: "犬系", eggColor: "blue", memo: "守護者として覚醒した姿。" },
  { no: 12, name: "マスターシャープ", stage: "覚醒期", type: "犬系", eggColor: "blue", memo: "すべてを見抜く猟犬。" },

  { no: 13, name: "ピヨン", stage: "スタート期", type: "鳥系", eggColor: "pink", memo: "ピンクの卵から生まれた鳥。" },
  { no: 14, name: "バードン", stage: "ビギナー期", type: "鳥系", eggColor: "pink", memo: "羽ばたき始めた鳥モンスター。" },
  { no: 15, name: "ハヤバード", stage: "ヒーロー期", type: "鳥系", eggColor: "pink", memo: "スピード型の空のエース。" },
  { no: 16, name: "プリズムバード", stage: "ヒーロー期", type: "鳥系", eggColor: "pink", memo: "テクニック型の美しい鳥。" },
  { no: 17, name: "スカイフェザー", stage: "覚醒期", type: "鳥系", eggColor: "pink", memo: "空を切り裂く覚醒体。" },
  { no: 18, name: "プリズムフェニックス", stage: "覚醒期", type: "鳥系", eggColor: "pink", memo: "光をまとう覚醒体。" }
];

export default function ZukanPage() {
  const router = useRouter();

  const [foundNos, setFoundNos] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<"all" | "found" | "locked">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadZukan();
  }, []);

  async function loadZukan() {
    const child = await getMyChild();

    if (!child) {
      router.push("/login");
      return;
    }

    // 1度でも育てたモンスターの「育成歴」から図鑑を埋める
    const { data, error } = await supabase
      .from("monsters")
      .select("egg_color, stage, speed, technique")
      .eq("child_id", child.id);

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    const rank: Record<string, number> = {
      スタート期: 0,
      ビギナー期: 1,
      ヒーロー期: 2,
      覚醒期: 3
    };
    const baseNo: Record<string, number> = { red: 1, blue: 7, pink: 13 };

    const found = new Set<number>();
    (data || []).forEach((row) => {
      const m = row as {
        egg_color: string;
        stage: string;
        speed: number;
        technique: number;
      };
      const base = baseNo[m.egg_color];
      if (base === undefined) {
        return;
      }
      const r = rank[m.stage] ?? 0;
      const branchA = (m.speed ?? 0) >= (m.technique ?? 0);

      found.add(base); // スタート期
      if (r >= 1) found.add(base + 1); // ビギナー期
      if (r >= 2) found.add(branchA ? base + 2 : base + 3); // ヒーロー期
      if (r >= 3) found.add(branchA ? base + 4 : base + 5); // 覚醒期
    });

    setFoundNos(found);
    setLoading(false);
  }

  const foundNames = { size: foundNos.size };

  const filteredMonsters = useMemo(() => {
    return zukanMaster.filter((monster) => {
      const found = foundNos.has(monster.no);

      if (filter === "found") {
        return found;
      }

      if (filter === "locked") {
        return !found;
      }

      return true;
    });
  }, [filter, foundNos]);

  if (loading) {
    return (
      <main className="page">
        <div className="phone">
          <div className="header">図鑑</div>
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
        <div className="header">図鑑</div>

        <div className="content" style={{ paddingBottom: 92 }}>
          <div className="card" style={{ textAlign: "center" }}>
            <div className="note">今シーズン：どうぶつ系</div>
            <div
              style={{
                fontSize: 40,
                fontWeight: 900,
                color: "#2f8ee5",
                lineHeight: 1.1
              }}
            >
              {foundNames.size} / {zukanMaster.length}
            </div>
            <div className="note">
              自分が実際に育てたモンスターだけ姿が表示されます。
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
              marginBottom: 14
            }}
          >
            <FilterButton label="すべて" active={filter === "all"} onClick={() => setFilter("all")} />
            <FilterButton label="登録済み" active={filter === "found"} onClick={() => setFilter("found")} />
            <FilterButton label="未発見" active={filter === "locked"} onClick={() => setFilter("locked")} />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12
            }}
          >
            {filteredMonsters.map((monster) => {
              const found = foundNos.has(monster.no);

              return (
                <ZukanCard
                  key={monster.no}
                  monster={monster}
                  found={found}
                />
              );
            })}
          </div>
        </div>
      </div>

      <BottomNav active="home" />
    </main>
  );
}

function FilterButton({
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
      style={{
        height: 44,
        border: "4px solid #2b1b10",
        borderRadius: 16,
        background: active ? "#ffd447" : "white",
        color: "#2b1b10",
        fontSize: 14,
        fontWeight: 900,
        boxShadow: "0 4px 0 #2b1b10"
      }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function ZukanCard({
  monster,
  found
}: {
  monster: ZukanMaster;
  found: boolean;
}) {
  return (
    <div
      style={{
        background: found ? "white" : "#e8edf2",
        border: "4px solid #2b1b10",
        borderRadius: 22,
        padding: 10,
        boxShadow: "0 5px 0 #2b1b10",
        textAlign: "center",
        minHeight: 196,
        opacity: found ? 1 : 0.9
      }}
    >
      <div
        style={{
          display: "inline-block",
          background: "#2b1b10",
          color: "white",
          borderRadius: 999,
          padding: "3px 8px",
          fontSize: 12,
          fontWeight: 900
        }}
      >
        No.{monster.no}
      </div>

      <div
        style={{
          display: "inline-block",
          marginLeft: 4,
          background: found ? "#2f8ee5" : "#777",
          color: "white",
          border: "3px solid #2b1b10",
          borderRadius: 999,
          padding: "3px 8px",
          fontSize: 11,
          fontWeight: 900
        }}
      >
        {found ? monster.stage : "未発見"}
      </div>

      <div
        style={{
          width: 90,
          height: 90,
          margin: "12px auto 6px",
          background: found
            ? "#fff1cf"
            : "repeating-linear-gradient(45deg,#d8e0e8 0,#d8e0e8 10px,#c7d0d9 10px,#c7d0d9 20px)",
          border: "4px solid #2b1b10",
          borderRadius: 22,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        {found ? (
          <MonsterIcon
            color={monster.eggColor}
            size={78}
            stage={monster.stage}
            speed={[3, 5].includes((monster.no - 1) % 6) ? 0 : 1}
            technique={[3, 5].includes((monster.no - 1) % 6) ? 1 : 0}
          />
        ) : (
          <div
            style={{
              fontSize: 52,
              fontWeight: 900,
              color: "#65717c"
            }}
          >
            ?
          </div>
        )}
      </div>

      <div
        style={{
          fontSize: 16,
          fontWeight: 900,
          color: "#2b1b10",
          minHeight: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        {found ? monster.name : "？？？？"}
      </div>

      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          color: "#5a3218",
          lineHeight: 1.35,
          marginTop: 4
        }}
      >
        {found ? monster.memo : "実際に育てると登録されます"}
      </div>
    </div>
  );
}
