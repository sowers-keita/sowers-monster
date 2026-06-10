import { EggColor } from "@/lib/types";

type MonsterIconProps = {
  color?: EggColor;
  size?: number;
  happy?: boolean;
};

export default function MonsterIcon({
  color = "red",
  size = 120,
  happy = false
}: MonsterIconProps) {
  // トリ系（ピンクの卵）は実際のドット絵スプライトを表示
  if (color === "pink") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={happy ? "/monsters/piyo_happy.png" : "/monsters/piyo_normal.png"}
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
