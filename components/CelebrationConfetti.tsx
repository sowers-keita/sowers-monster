"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";

/**
 * 両端からクラッカー（紙吹雪）が打ち上がるお祝い演出。
 * fireKey が変わるたびに一度だけ再生される（同じ値では再生しない）。
 * 画面全体に重なる固定オーバーレイで、操作はそのまま通す（pointer-events:none）。
 */
export default function CelebrationConfetti({ fireKey }: { fireKey: number }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!fireKey) return;
    setOn(true);

    // クラッカーの「パンッ」という音を簡易合成（端末が許せば）
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (Ctx) {
        const ac = new Ctx();
        const burst = (delay: number) => {
          const t = ac.currentTime + delay;
          const dur = 0.18;
          const buf = ac.createBuffer(
            1,
            Math.floor(ac.sampleRate * dur),
            ac.sampleRate
          );
          const data = buf.getChannelData(0);
          for (let i = 0; i < data.length; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
          }
          const src = ac.createBufferSource();
          src.buffer = buf;
          const g = ac.createGain();
          g.gain.setValueAtTime(0.35, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + dur);
          src.connect(g).connect(ac.destination);
          src.start(t);
          src.stop(t + dur);
        };
        burst(0);
        burst(0.06);
      }
    } catch {
      // 音は出せなくても演出は続行
    }

    const t = setTimeout(() => setOn(false), 3000);
    return () => clearTimeout(t);
  }, [fireKey]);

  // パーティクル生成（左右の下隅から噴き上がる）
  const pieces = useMemo(() => {
    if (!fireKey) return [];
    const colors = [
      "#ff4b35",
      "#ffd447",
      "#2bb869",
      "#2f8ee5",
      "#e88aa8",
      "#ff7a00",
      "#9b5de5"
    ];
    const make = (side: "L" | "R", count: number) =>
      Array.from({ length: count }).map((_, i) => {
        // 内側・上方向へ飛ぶ
        const dist = 150 + Math.random() * 230; // px
        const angle =
          side === "L"
            ? (-20 - Math.random() * 55) * (Math.PI / 180) // 右上方向
            : (-105 - Math.random() * 55) * (Math.PI / 180); // 左上方向
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist; // 負=上
        return {
          id: `${side}-${i}`,
          side,
          color: colors[Math.floor(Math.random() * colors.length)],
          dx: Math.round(dx),
          dy: Math.round(dy),
          fall: 220 + Math.random() * 260,
          rot: Math.round((Math.random() * 6 - 3) * 360),
          delay: Math.random() * 0.12,
          dur: 1.6 + Math.random() * 1.0,
          w: 7 + Math.random() * 7,
          h: 10 + Math.random() * 8,
          round: Math.random() < 0.3
        };
      });
    return [...make("L", 70), ...make("R", 70)];
  }, [fireKey]);

  if (!on) return null;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 99999
      }}
    >
      <style>{`
        @keyframes swm-pop {
          0%   { transform: translate(0,0) rotate(0deg); opacity: 1; }
          70%  { opacity: 1; }
          100% {
            transform: translate(var(--dx), calc(var(--dy) + var(--fall)))
                       rotate(var(--rot));
            opacity: 0;
          }
        }
        @keyframes swm-flash {
          0%   { transform: scale(0.2); opacity: 0.9; }
          100% { transform: scale(2.4); opacity: 0; }
        }
      `}</style>

      {/* 左右の閃光（クラッカーの口） */}
      <div
        style={{
          position: "absolute",
          left: -10,
          bottom: -10,
          width: 90,
          height: 90,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,221,71,.95), rgba(255,122,0,0))",
          animation: "swm-flash .5s ease-out forwards"
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -10,
          bottom: -10,
          width: 90,
          height: 90,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,221,71,.95), rgba(255,122,0,0))",
          animation: "swm-flash .5s ease-out forwards"
        }}
      />

      {pieces.map((p) => {
        const style: Record<string, string | number> = {
          position: "absolute",
          bottom: 6,
          [p.side === "L" ? "left" : "right"]: 10,
          width: p.w,
          height: p.h,
          background: p.color,
          borderRadius: p.round ? "50%" : 2,
          "--dx": `${p.side === "L" ? p.dx : -p.dx}px`,
          "--dy": `${p.dy}px`,
          "--fall": `${p.fall}px`,
          "--rot": `${p.rot}deg`,
          animation: `swm-pop ${p.dur}s cubic-bezier(.15,.6,.4,1) ${p.delay}s forwards`,
          willChange: "transform, opacity"
        };
        return <span key={p.id} style={style as CSSProperties} />;
      })}
    </div>
  );
}
