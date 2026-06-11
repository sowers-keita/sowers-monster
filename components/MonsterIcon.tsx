import { EggColor } from "@/lib/types";

type MonsterIconProps = {
  color?: EggColor;
  size?: number;
  happy?: boolean;
  stage?: string;
  speed?: number;
  technique?: number;
};

// 進化段階＋分岐（A=正義型/スピード型, B=悪型/テクニック型）から画像を決める
function formKey(stage?: string, speed = 0, technique = 0) {
  if (stage === "ビギナー期") return "2";
  if (stage === "ヒーロー期") return speed >= technique ? "3s" : "3t";
  if (stage === "覚醒期") return speed >= technique ? "4s" : "4t";
  return "1"; // スタート期 / 既定
}

export default function MonsterIcon({
  color = "red",
  size = 120,
  happy = false,
  stage,
  speed = 0,
  technique = 0
}: MonsterIconProps) {
  const key = formKey(stage, speed, technique);
  const src = `/monsters/${color}_${key}_${happy ? "happy" : "normal"}.png`;

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
