"use client";

import Phone from "@/components/Phone";
import { EggColor } from "@/lib/types";
import { useRouter } from "next/navigation";

export default function EggSelectPage() {
  const router = useRouter();

  function selectEgg(color: EggColor) {
    router.push(`/egg-hatch?egg=${color}`);
  }

  return (
    <Phone title="新しい卵を選ぶ">
      <div className="card">
        <div className="title">最初の卵を選ぼう</div>
        <div className="note">
          どんな モンスターが 生まれるかは、生まれてからの おたのしみ！
        </div>

        <EggCard
          color="red"
          title="赤い卵"
          description="あかい モンスターが 生まれるよ。"
          onClick={() => selectEgg("red")}
        />

        <EggCard
          color="blue"
          title="青い卵"
          description="あおい モンスターが 生まれるよ。"
          onClick={() => selectEgg("blue")}
        />

        <EggCard
          color="pink"
          title="ピンクの卵"
          description="ピンクの モンスターが 生まれるよ。"
          onClick={() => selectEgg("pink")}
        />
      </div>
    </Phone>
  );
}

function EggCard({
  color,
  title,
  description,
  onClick
}: {
  color: EggColor;
  title: string;
  description: string;
  onClick: () => void;
}) {
  const background =
    color === "red"
      ? "linear-gradient(135deg, #ff3d25, #ff8a00)"
      : color === "blue"
      ? "linear-gradient(135deg, #1383ff, #22c0ff)"
      : "linear-gradient(135deg, #ff6fb1, #ffc1df)";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "82px 1fr",
        gap: 14,
        alignItems: "center",
        background: "#fffaf0",
        border: "4px solid #2b1b10",
        borderRadius: 22,
        padding: 12,
        marginTop: 12
      }}
    >
      <div
        style={{
          width: 72,
          height: 92,
          border: "5px solid #2b1b10",
          borderRadius: "50% 50% 44% 44%",
          background,
          boxShadow: "inset -10px -12px 0 rgba(0,0,0,0.15)"
        }}
      />

      <div>
        <div style={{ fontSize: 21, fontWeight: 900, color: "#2b1b10" }}>
          {title}
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 800,
            color: "#5a3218",
            marginTop: 4
          }}
        >
          {description}
        </div>
        <button
          className="button"
          style={{ minHeight: 46, fontSize: 18 }}
          onClick={onClick}
        >
          この卵にする
        </button>
      </div>
    </div>
  );
}
