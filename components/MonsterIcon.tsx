import { EggColor } from "@/lib/types";

type MonsterIconProps = {
  color?: EggColor;
  size?: number;
};

export default function MonsterIcon({ color = "red", size = 120 }: MonsterIconProps) {
  const mainColor =
    color === "red" ? "#e94b35" : color === "blue" ? "#2f8ee5" : "#ff6fb1";

  const bodyColor =
    color === "red" ? "#ff8a3d" : color === "blue" ? "#7bd0ff" : "#ffc1df";

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
