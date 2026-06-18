"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";

/**
 * 全画面を覆う、にぎやかなお祝い演出。
 * ・上から大量の紙吹雪が降ってモンスターにもしっかりかかる
 * ・両端の下からクラッカー（強力キャノン）が打ち上がる
 * ・中央付近で🎉が弾け、ゴールドの閃光が走る
 * fireKey が変わるたびに一度だけ再生。pointer-events:none で操作は邪魔しない。
 */
export default function CelebrationConfetti({ fireKey }: { fireKey: number }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!fireKey) return;
    setOn(true);

    // クラッカーの「パンパンッ」という音を簡易合成（端末が許せば）
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (Ctx) {
        const ac = new Ctx();
        const burst = (delay: number, vol: number) => {
          const t = ac.currentTime + delay;
          const dur = 0.2;
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
          g.gain.setValueAtTime(vol, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + dur);
          src.connect(g).connect(ac.destination);
          src.start(t);
          src.stop(t + dur);
        };
        burst(0, 0.4);
        burst(0.07, 0.35);
        burst(0.15, 0.3);
      }
    } catch {
      // 音は出せなくても演出は続行
    }

    const t = setTimeout(() => setOn(false), 4000);
    return () => clearTimeout(t);
  }, [fireKey]);

  const COLORS = [
    "#ff4b35",
    "#ffd447",
    "#2bb869",
    "#2f8ee5",
    "#e88aa8",
    "#ff7a00",
    "#9b5de5",
    "#19d3c5",
    "#ffffff"
  ];
  const rand = (a: number, b: number) => a + Math.random() * (b - a);

  // 両端の下から噴き上がるキャノン
  const cannon = useMemo(() => {
    if (!fireKey) return [];
    const make = (side: "L" | "R") =>
      Array.from({ length: 90 }).map((_, i) => {
        const dist = rand(220, 520);
        const angle =
          side === "L"
            ? rand(-18, -78) * (Math.PI / 180)
            : (180 - rand(-18, -78)) * (Math.PI / 180) * -1; // 右は左上方向
        const dx = Math.cos(angle) * dist * (side === "L" ? 1 : -1);
        const dy = -Math.abs(Math.sin(angle) * dist);
        return {
          id: `${side}-${i}`,
          side,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          dx: Math.round(dx),
          dy: Math.round(dy),
          fall: rand(360, 620),
          rot: Math.round(rand(-4, 4) * 360),
          delay: rand(0, 0.18),
          dur: rand(1.8, 3.2),
          w: rand(8, 16),
          h: rand(12, 24),
          round: Math.random() < 0.28
        };
      });
    return [...make("L"), ...make("R")];
  }, [fireKey]);

  // 上から降る紙吹雪（モンスターにもかかる）
  const rain = useMemo(() => {
    if (!fireKey) return [];
    return Array.from({ length: 150 }).map((_, i) => ({
      id: `r-${i}`,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      left: rand(0, 100),
      drift: Math.round(rand(-80, 80)),
      rot: Math.round(rand(-3, 3) * 360),
      delay: rand(0, 1.4),
      dur: rand(2.4, 4.0),
      w: rand(7, 14),
      h: rand(10, 20),
      round: Math.random() < 0.3,
      start: rand(-20, -120)
    }));
  }, [fireKey]);

  // 中央で弾ける🎉などの絵文字
  const emojis = useMemo(() => {
    if (!fireKey) return [];
    const set = ["🎉", "🎊", "✨", "⭐", "🌟"];
    return Array.from({ length: 14 }).map((_, i) => {
      const ang = rand(0, Math.PI * 2);
      const dist = rand(80, 220);
      return {
        id: `e-${i}`,
        ch: set[Math.floor(Math.random() * set.length)],
        dx: Math.round(Math.cos(ang) * dist),
        dy: Math.round(Math.sin(ang) * dist),
        delay: rand(0, 0.5),
        dur: rand(1.4, 2.2),
        size: rand(22, 44),
        rot: Math.round(rand(-2, 2) * 360)
      };
    });
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
        @keyframes swm-cannon {
          0%   { transform: translate(0,0) rotate(0deg); opacity: 1; }
          75%  { opacity: 1; }
          100% { transform: translate(var(--dx), calc(var(--dy) + var(--fall))) rotate(var(--rot)); opacity: 0; }
        }
        @keyframes swm-rain {
          0%   { transform: translate(0, var(--start)) rotate(0deg); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translate(var(--drift), 112vh) rotate(var(--rot)); opacity: 1; }
        }
        @keyframes swm-emoji {
          0%   { transform: translate(0,0) scale(0.3) rotate(0deg); opacity: 0; }
          25%  { opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) scale(1.2) rotate(var(--rot)); opacity: 0; }
        }
        @keyframes swm-flash {
          0%   { transform: scale(0.2); opacity: 0.9; }
          100% { transform: scale(3); opacity: 0; }
        }
      `}</style>

      {/* 左右クラッカーの閃光 */}
      {(["L", "R"] as const).map((s) => (
        <div
          key={`flash-${s}`}
          style={{
            position: "absolute",
            [s === "L" ? "left" : "right"]: -16,
            bottom: -16,
            width: 120,
            height: 120,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,221,71,.95), rgba(255,122,0,0))",
            animation: "swm-flash .55s ease-out forwards"
          }}
        />
      ))}

      {/* 上から降る紙吹雪 */}
      {rain.map((p) => {
        const style: Record<string, string | number> = {
          position: "absolute",
          top: 0,
          left: `${p.left}%`,
          width: p.w,
          height: p.h,
          background: p.color,
          borderRadius: p.round ? "50%" : 2,
          "--start": `${p.start}px`,
          "--drift": `${p.drift}px`,
          "--rot": `${p.rot}deg`,
          animation: `swm-rain ${p.dur}s linear ${p.delay}s forwards`,
          willChange: "transform, opacity"
        };
        return <span key={p.id} style={style as CSSProperties} />;
      })}

      {/* 両端キャノン */}
      {cannon.map((p) => {
        const style: Record<string, string | number> = {
          position: "absolute",
          bottom: 8,
          [p.side === "L" ? "left" : "right"]: 12,
          width: p.w,
          height: p.h,
          background: p.color,
          borderRadius: p.round ? "50%" : 2,
          "--dx": `${p.dx}px`,
          "--dy": `${p.dy}px`,
          "--fall": `${p.fall}px`,
          "--rot": `${p.rot}deg`,
          animation: `swm-cannon ${p.dur}s cubic-bezier(.12,.62,.36,1) ${p.delay}s forwards`,
          willChange: "transform, opacity"
        };
        return <span key={p.id} style={style as CSSProperties} />;
      })}

      {/* 中央で弾ける絵文字 */}
      {emojis.map((p) => {
        const style: Record<string, string | number> = {
          position: "absolute",
          left: "50%",
          top: "38%",
          fontSize: p.size,
          lineHeight: 1,
          "--dx": `${p.dx}px`,
          "--dy": `${p.dy}px`,
          "--rot": `${p.rot}deg`,
          animation: `swm-emoji ${p.dur}s ease-out ${p.delay}s forwards`,
          willChange: "transform, opacity"
        };
        return (
          <span key={p.id} style={style as CSSProperties}>
            {p.ch}
          </span>
        );
      })}
    </div>
  );
}
