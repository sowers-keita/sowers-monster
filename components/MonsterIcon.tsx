import { EggColor } from "@/lib/types";

type MonsterIconProps = {
  color?: EggColor;
  size?: number;
  happy?: boolean;
  stage?: string;
  speed?: number;
  technique?: number;
};

// 進化段階＋分岐（スピード型/テクニック型）から画像を決める
function birdForm(stage?: string, speed = 0, technique = 0) {
  if (stage === "ビギナー期") return "bird2";
  if (stage === "ヒーロー期") return speed >= technique ? "bird3s" : "bird3t";
  if (stage === "覚醒期") return speed >= technique ? "bird4s" : "bird4t";
  return "bird1"; // スタート期 / 既定
}

export default function MonsterIcon({
  color = "red",
  size = 120,
  happy = false,
  stage,
  speed = 0,
  technique = 0
}: MonsterIconProps) {
  // トリ系（ピンクの卵）は実際のドット絵スプライトを表示
  if (color === "pink") {
    const form = birdForm(stage, speed, technique);
    const src = `/monsters/${form}_${happy ? "happy" : "normal"}.png`;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt="モンスター"
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          objectFit: "contain",
          imageRendering: "pixelated",
          display: "block",
          margin: "0 auto"
        }}
      />
    );
  }

  const mainColor = color === "blue" ? "#2f8ee5" : "#e94b35";
  const bodyColor = color === "blue" ? "#7bd0ff" : "#ff8a3d";

  return (
    <div
      className="monster-icon"
      style={{
        width: size,
        height: size
      }}
    >
      <div className="monster-ear left" style={{ background: mainColor }} />
      <div className="monster-ear right" style={{ background: mainColor }} />
      <div className="monster-head" style={{ background: mainColor }}>
        <div className="monster-eye left" />
        <div className="monster-eye right" />
      </div>
      <div className="monster-body" style={{ background: bodyColor }} />
    </div>
  );
}
