"use client";

import MonsterIcon from "@/components/MonsterIcon";
import Phone from "@/components/Phone";
import { supabase } from "@/lib/supabaseClient";
import { EggColor } from "@/lib/types";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

export default function EggHatchPage() {
  return (
    <Suspense fallback={null}>
      <EggHatchInner />
    </Suspense>
  );
}

const monsterByEgg = {
  red: {
    name: "モンキー",
    type: "サル系"
  },
  blue: {
    name: "ワンちゃん",
    type: "犬系"
  },
  pink: {
    name: "ピヨン",
    type: "鳥系"
  }
};

function EggHatchInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const egg = (searchParams.get("egg") || "red") as EggColor;

  const [hatched, setHatched] = useState(false);
  const [saving, setSaving] = useState(false);

  async function hatch() {
    setSaving(true);

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;

    if (!userId) {
      alert("ログインが必要です");
      router.push("/login");
      return;
    }

    const { data: child, error: childError } = await supabase
      .from("children")
      .select("id")
      .eq("parent_id", userId)
      .limit(1)
      .single();

    if (childError || !child) {
      alert("子ども情報が見つかりません");
      router.push("/register-child");
      return;
    }

    const monsterData = monsterByEgg[egg];

    const { error } = await supabase.from("monsters").insert({
      child_id: child.id,
      name: monsterData.name,
      egg_color: egg,
      stage: "スタート期",
      power: 0,
      power_max: 10,
      stamina: 0,
      stamina_max: 10,
      speed: 0,
      speed_max: 10,
      technique: 0,
      technique_max: 10,
      battle_power: 0,
      is_active: true
    });

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    setHatched(true);
    setSaving(false);
  }

  return (
    <Phone title="卵がかえる！">
      <div
        className="card"
        style={{
          textAlign: "center",
          minHeight: 430,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center"
        }}
      >
        {!hatched ? (
          <>
            <Egg color={egg} />
            <div className="title" style={{ marginTop: 20 }}>
              卵が動いている…
            </div>
            <button className="button orange" onClick={hatch} disabled={saving}>
              {saving ? "保存中…" : "卵を見守る"}
            </button>
          </>
        ) : (
          <>
            <MonsterIcon color={egg} size={130} />
            <div className="title" style={{ marginTop: 20 }}>
              {monsterByEgg[egg].name} が生まれた！
            </div>
            <div className="note">これから一緒に育てよう！</div>
            <button className="button" onClick={() => router.push("/home")}>
              ホームへ
            </button>
          </>
        )}
      </div>
    </Phone>
  );
}

function Egg({ color }: { color: EggColor }) {
  const background =
    color === "red"
      ? "linear-gradient(135deg, #ff3d25, #ff8a00)"
      : color === "blue"
      ? "linear-gradient(135deg, #1383ff, #22c0ff)"
      : "linear-gradient(135deg, #ff6fb1, #ffc1df)";

  return (
    <div
      style={{
        width: 118,
        height: 150,
        border: "6px solid #2b1b10",
        borderRadius: "50% 50% 44% 44%",
        background,
        margin: "0 auto",
        boxShadow: "inset -16px -18px 0 rgba(0,0,0,0.15)"
      }}
    />
  );
}
