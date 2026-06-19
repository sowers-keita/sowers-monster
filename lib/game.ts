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
export type GameType =
  | "friend"
  | "running"
  | "stop"
  | "thread"
  | "stopwatch"
  | "number";

export const gameLabels: Record<GameType, string> = {
  friend: "連打",
  running: "ランニング",
  stop: "ストップ",
  thread: "糸通し",
  stopwatch: "ストップウォッチ",
  number: "数字タッチ"
};

// （種の配布は停止中。型のために残置）
export const gameSeed: Record<GameType, SeedType> = {
  friend: "power",
  running: "stamina",
  stop: "speed",
  thread: "technique",
  stopwatch: "power",
  number: "speed"
};

export const gameScoreUnit: Record<GameType, string> = {
  friend: "回",
  running: "m",
  stop: "連続",
  thread: "枚",
  stopwatch: "点",
  number: "点"
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
    // ストップウォッチは「10.000秒(=10000ms)にいちばん近い」記録をベストにする。
    // それ以外のゲームは これまで通り 高いスコアがベスト。
    const better =
      gameType === "stopwatch"
        ? Math.abs(score - 10000) < Math.abs(Number(existing.score || 0) - 10000)
        : score > Number(existing.score || 0);
    if (better) {
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
  // ストップウォッチは「10.000秒(=10000ms)に近い順」で並べる（点数ではなく時間で競う）。
  // 近さはSQLで並べられないため、その週の記録を全件取得してから並べ替える。
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rows: any[] = [];
  if (gameType === "stopwatch") {
    const { data } = await supabase
      .from("game_scores")
      .select("child_id, score, children ( name, classrooms ( name ) )")
      .eq("game_type", gameType)
      .eq("week_start", weekStartStr);
    rows = ((data || []) as any[]).slice();
    rows.sort(
      (a, b) =>
        Math.abs(Number(a.score) - 10000) - Math.abs(Number(b.score) - 10000)
    );
    rows = rows.slice(0, limit);
  } else {
    const { data } = await supabase
      .from("game_scores")
      .select("child_id, score, children ( name, classrooms ( name ) )")
      .eq("game_type", gameType)
      .eq("week_start", weekStartStr)
      .order("score", { ascending: false })
      .limit(limit);
    rows = (data || []) as any[];
  }

  return rows.map((r) => ({
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

// トレーニングからの種の配布は停止しました。
// 種は実際の練習レビューで発行される「あいことば」からのみ付与されます。
// （ランキング自体は今までどおり集計・表示されます）
export async function claimWeeklyGameRewards(
  _childId: string
): Promise<WeeklyRewardResult[]> {
  return [];
}

export function calcEvolutionReady(monster: ActiveMonster) {
  const total =
    monster.power +
    monster.stamina +
    monster.speed +
    monster.technique;

  if (monster.stage === "スタート期" && total >= 100) {
    return true;
  }

  if (monster.stage === "ビギナー期" && total >= 250) {
    return true;
  }

  if (monster.stage === "ヒーロー期" && total >= 400) {
    return true;
  }

  return false;
}
