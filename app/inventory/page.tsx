"use client";

import BottomNav from "@/components/BottomNav";
import {
  ActiveMonster,
  SeedItem,
  SeedType,
  consumeSeed,
  getMyActiveMonster,
  getMySeeds,
  getSeedMaxIncrease,
  seedDescriptions,
  seedLabels
} from "@/lib/game";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const allSeedTypes: SeedType[] = [
  "power",
  "stamina",
  "speed",
  "technique",
  "all",
  "rainbow"
];

export default function InventoryPage() {
  const router = useRouter();

  const [monster, setMonster] = useState<ActiveMonster | null>(null);
  const [seeds, setSeeds] = useState<SeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const currentMonster = await getMyActiveMonster();

    if (!currentMonster) {
      router.push("/login");
      return;
    }

    const currentSeeds = await getMySeeds();

    setMonster(currentMonster);
    setSeeds(currentSeeds);
    setLoading(false);
  }

  function getCount(seedType: SeedType) {
    return seeds.find((seed) => seed.seed_type === seedType)?.count || 0;
  }

  async function useSeed(seedType: SeedType) {
    if (!monster) {
      return;
    }

    const seed = seeds.find((item) => item.seed_type === seedType);

    if (!seed || seed.count <= 0) {
      alert("この種を持っていません");
      return;
    }

    const amount = getSeedMaxIncrease(seedType);

    const update: Partial<ActiveMonster> = {};

    if (seedType === "power") {
      update.power_max = monster.power_max + amount;
    }

    if (seedType === "stamina") {
      update.stamina_max = monster.stamina_max + amount;
    }

    if (seedType === "speed") {
      update.speed_max = monster.speed_max + amount;
    }

    if (seedType === "technique") {
      update.technique_max = monster.technique_max + amount;
    }

    if (seedType === "all") {
      update.power_max = monster.power_max + amount;
      update.stamina_max = monster.stamina_max + amount;
      update.speed_max = monster.speed_max + amount;
      update.technique_max = monster.technique_max + amount;
    }

    if (seedType === "rainbow") {
      update.power_max = monster.power_max + amount;
    }

    const { error } = await supabase
      .from("monsters")
      .update(update)
      .eq("id", monster.id);

    if (error) {
      alert(error.message);
      return;
    }

    await consumeSeed(seed.id, seed.count - 1);

    alert(`${seedLabels[seedType]}を使いました！`);

    await load();
  }

  if (loading) {
    return (
      <main className="page">
        <div className="phone">
          <div className="header">持ち物</div>
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
        <div className="header">持ち物</div>

        <div className="content" style={{ paddingBottom: 92 }}>
          <div className="card">
            <div className="title">種を使う</div>
            <div className="note">
              種を使うと能力の限界値が上がります。実際の能力値はトレーニングで伸ばします。
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12
            }}
          >
            {allSeedTypes.map((seedType) => (
              <SeedCard
                key={seedType}
                seedType={seedType}
                count={getCount(seedType)}
                onUse={() => useSeed(seedType)}
              />
            ))}
          </div>

          <button className="button orange" onClick={() => router.push("/training")}>
            トレーニングへ
          </button>
        </div>
      </div>

      <BottomNav active="inventory" />
    </main>
  );
}

function SeedCard({
  seedType,
  count,
  onUse
}: {
  seedType: SeedType;
  count: number;
  onUse: () => void;
}) {
  return (
    <div
      style={{
        background: "#fff8e8",
        border: "4px solid #2b1b10",
        borderRadius: 22,
        padding: 10,
        textAlign: "center",
        boxShadow: "0 5px 0 #2b1b10"
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 900,
          color: "#2b1b10",
          minHeight: 42,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        {seedLabels[seedType]}
      </div>

      <SeedIcon seedType={seedType} />

      <div
        style={{
          fontSize: 26,
          fontWeight: 900,
          color: "#2b1b10",
          textAlign: "right",
          marginRight: 6
        }}
      >
        ×{count}
      </div>

      <div className="note" style={{ minHeight: 44 }}>
        {seedDescriptions[seedType]}
      </div>

      <button
        className="button"
        style={{ minHeight: 48, fontSize: 18 }}
        onClick={onUse}
        disabled={count <= 0}
      >
        使う
      </button>
    </div>
  );
}

function SeedIcon({ seedType }: { seedType: SeedType }) {
  const background =
    seedType === "power"
      ? "linear-gradient(135deg, #ff3d25, #ff8a00)"
      : seedType === "stamina"
      ? "linear-gradient(135deg, #1383ff, #22c0ff)"
      : seedType === "speed"
      ? "linear-gradient(135deg, #42b72a, #b9ff35)"
      : seedType === "technique"
      ? "linear-gradient(135deg, #6f2dd8, #cc76ff)"
      : seedType === "all"
      ? "linear-gradient(135deg, #ffb000, #ffe96a)"
      : "linear-gradient(135deg, #ff335f, #ffb000, #39d353, #18a0fb, #a83dff)";

  return (
    <div
      style={{
        width: 86,
        height: 104,
        border: "5px solid #2b1b10",
        borderRadius: "50% 50% 44% 44%",
        background,
        margin: "8px auto",
        boxShadow: "inset -12px -14px 0 rgba(0,0,0,0.15)",
        position: "relative"
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 16,
          top: -8,
          width: 54,
          height: 26,
          background: "#54b83f",
          border: "4px solid #2b1b10",
          borderRadius: "50% 50% 35% 35%",
          transform: "rotate(-8deg)"
        }}
      />
    </div>
  );
}
