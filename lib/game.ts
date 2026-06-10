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
  power: "パワーの限界値が上がります",
  stamina: "スタミナの限界値が上がります",
  speed: "スピードの限界値が上がります",
  technique: "テクニックの限界値が上がります",
  all: "すべての限界値が少し上がります",
  rainbow: "好きな能力を大きく伸ばせる特別な種です"
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
  if (seedType === "rainbow") {
    return 10;
  }

  if (seedType === "all") {
    return 1;
  }

  return 3;
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
