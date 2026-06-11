import { supabase } from "@/lib/supabaseClient";

export type SeedType =
  | "power"
  | "stamina"
  | "speed"
  | "technique"
  | "all"
  | "rainbow";

export type ActiveChild = {
  id: string;
  name: string;
  classroom_id: string | null;
};

export type ActiveMonster = {
  id: string;
  child_id: string;
  season_id?: string | null;
  name: string;
  egg_color: "red" | "blue" | "pink";
  stage: string;
  power: number;
  power_max: number;
  stamina: number;
  stamina_max: number;
  speed: number;
  speed_max: number;
  technique: number;
  technique_max: number;
  battle_power: number;
  is_active: boolean;
  created_at: string;
};

export type SeedItem = {
  id: string;
  child_id: string;
  seed_type: SeedType;
  count: number;
};

export const seedLabels: Record<SeedType, string> = {
  power: "パワーの種",
  stamina: "スタミナの種",
  speed: "スピードの種",
  technique: "テクニックの種",
  all: "万能の種",
  rainbow: "虹の種"
};

export const seedDescriptions: Record<SeedType, string> = {
  power: "パワーの限界値が +5",
  stamina: "スタミナの限界値が +5",
  speed: "スピードの限界値が +5",
  technique: "テクニックの限界値が +5",
  all: "すべての限界値が +5 ずつ",
  rainbow: "好きな能力を 1つ +10"
};

export async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user.id;
}

export async function getMyChild(): Promise<ActiveChild | null> {
  const userId = await getCurrentUserId();

  if (!userId) {
    return null;
  }

  const { data, error } = await supabase
    .from("children")
    .select("id, name, classroom_id")
    .eq("parent_id", userId)
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data as ActiveChild;
}

export async function getMyActiveMonster(): Promise<ActiveMonster | null> {
  const child = await getMyChild();

  if (!child) {
    return null;
  }

  const { data, error } = await supabase
    .from("monsters")
    .select("*")
    .eq("child_id", child.id)
    .eq("is_active", true)
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data as ActiveMonster;
}

export async function getMySeeds(): Promise<SeedItem[]> {
  const child = await getMyChild();

  if (!child) {
    return [];
  }

  const { data, error } = await supabase
    .from("seeds")
    .select("*")
    .eq("child_id", child.id)
    .order("seed_type");

  if (error || !data) {
    return [];
  }

  return data as SeedItem[];
}

export async function addSeedToChild(
  childId: string,
  seedType: SeedType,
  amount: number
) {
  const { data: existing } = await supabase
    .from("seeds")
    .select("*")
    .eq("child_id", childId)
    .eq("seed_type", seedType)
    .maybeSingle();

  if (existing) {
    const nextCount = Number(existing.count || 0) + amount;

    const { error } = await supabase
      .from("seeds")
      .update({ count: nextCount })
      .eq("id", existing.id);

    if (error) {
      throw error;
    }

    return;
  }

  const { error } = await supabase.from("seeds").insert({
    child_id: childId,
    seed_type: seedType,
    count: amount
  });

  if (error) {
    throw error;
  }
}

export async function consumeSeed(seedId: string, nextCount: number) {
  const { error } = await supabase
    .from("seeds")
    .update({ count: nextCount })
    .eq("id", seedId);

  if (error) {
    throw error;
  }
}

export function getSeedMaxIncrease(seedType: SeedType) {
  // 虹の種は好きな能力を +10。小さな実（各種・万能）は +5。
  if (seedType === "rainbow") {
    return 10;
  }

  return 5;
}

// ====== ミニゲーム 週間ランキング ======
export type GameType = "friend" | "running" | "stop" | "thread";

export const gameLabels: Record<GameType, string> = {
  friend: "連打",
  running: "ランニング",
  stop: "ストップ",
  thread: "糸通し"
};

// 各ゲームの1位〜3位がもらえる「成長の種」
export const gameSeed: Record<GameType, SeedType> = {
  friend: "power",
  running: "stamina",
  stop: "speed",
  thread: "technique"
};

export const gameScoreUnit: Record<GameType, string> = {
  friend: "回",
  running: "m",
  stop: "連続",
  thread: "枚"
};

// 月曜はじまりの週の開始日（ローカル日付）
export function mondayStart(base?: Date): Date {
  const x = base ? new Date(base) : new Date();
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7; // 月=0 … 日=6
  x.setDate(x.getDate() - day);
  return x;
}

export function ymdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// その週のベストスコアだけを残す（child×game×週で1行）
export async function saveGameScore(
  childId: string,
  gameType: GameType,
  score: number
) {
  if (!childId || score <= 0) {
    return;
  }

  const ws = ymdLocal(mondayStart());

  const { data: existing } = await supabase
    .from("game_scores")
    .select("id, score")
    .eq("child_id", childId)
    .eq("game_type", gameType)
    .eq("week_start", ws)
    .maybeSingle();

  if (existing) {
    if (score > Number(existing.score || 0)) {
      await supabase
        .from("game_scores")
        .update({ score, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    }
    return;
  }

  await supabase.from("game_scores").insert({
    child_id: childId,
    game_type: gameType,
    score,
    week_start: ws
  });
}

export type GameRankRow = {
  child_id: string;
  score: number;
  child_name: string;
  classroom: string;
};

export async function getGameRanking(
  gameType: GameType,
  weekStartStr: string,
  limit = 30
): Promise<GameRankRow[]> {
  const { data } = await supabase
    .from("game_scores")
    .select("child_id, score, children ( name, classrooms ( name ) )")
    .eq("game_type", gameType)
    .eq("week_start", weekStartStr)
    .order("score", { ascending: false })
    .limit(limit);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data || []) as any[]).map((r) => ({
    child_id: r.child_id,
    score: r.score,
    child_name: r.children?.name || "なまえ未設定",
    classroom: r.children?.classrooms?.name || "所属未設定"
  }));
}

export type WeeklyRewardResult = {
  gameType: GameType;
  rank: number;
  seed: SeedType;
};

// 先週（前の月〜日）の各ゲーム上位3人なら、種を1回だけ自動で受け取る
export async function claimWeeklyGameRewards(
  childId: string
): Promise<WeeklyRewardResult[]> {
  if (!childId) {
    return [];
  }

  const lastWeek = mondayStart();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const ws = ymdLocal(lastWeek);

  const games: GameType[] = ["friend", "running", "stop", "thread"];
  const results: WeeklyRewardResult[] = [];

  for (const g of games) {
    const top = await getGameRanking(g, ws, 3);
    const idx = top.findIndex((r) => r.child_id === childId);

    if (idx < 0) {
      continue;
    }

    // 受け取り記録（1回だけ）。すでに受け取り済みなら unique 制約でエラー。
    const { error } = await supabase.from("game_reward_logs").insert({
      child_id: childId,
      game_type: g,
      week_start: ws
    });

    if (error) {
      continue;
    }

    try {
      await addSeedToChild(childId, gameSeed[g], 1);
      results.push({ gameType: g, rank: idx + 1, seed: gameSeed[g] });
    } catch {
      // 付与に失敗しても続行
    }
  }

  return results;
}

export function calcEvolutionReady(monster: ActiveMonster) {
  const total =
    monster.power +
    monster.stamina +
    monster.speed +
    monster.technique;

  if (monster.stage === "スタート期" && total >= 20) {
    return true;
  }

  if (monster.stage === "ビギナー期" && total >= 60) {
    return true;
  }

  if (monster.stage === "ヒーロー期" && total >= 120) {
    return true;
  }

  return false;
}
