export type UserRole = "parent" | "coach" | "admin";

export type EggColor = "red" | "blue" | "pink";

export type MonsterStage =
  | "スタート期"
  | "ビギナー期"
  | "ヒーロー期"
  | "覚醒期";

export type ChildProfile = {
  id?: string;
  name: string;
  classroomName: string;
};

export type CurrentMonster = {
  id?: string;
  name: string;
  eggColor: EggColor;
  stage: MonsterStage;
  power: number;
  powerMax: number;
  stamina: number;
  staminaMax: number;
  speed: number;
  speedMax: number;
  technique: number;
  techniqueMax: number;
  battlePower: number;
};

export const defaultStats = {
  power: 0,
  powerMax: 10,
  stamina: 0,
  staminaMax: 10,
  speed: 0,
  speedMax: 10,
  technique: 0,
  techniqueMax: 10,
  battlePower: 0
};
