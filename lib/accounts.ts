// 端末内アカウント保存（兄弟のクイック切り替え用・PIN方式）
// セッション(リフレッシュトークン)とPINハッシュを localStorage に保持する。
export type SavedAccount = {
  id: string; // ユーザーID
  label: string; // 表示名（子のニックネーム等）
  email: string;
  pinHash: string;
  accessToken: string;
  refreshToken: string;
  updatedAt: number;
};

const KEY = "swm_accounts";

export function getAccounts(): SavedAccount[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as SavedAccount[];
  } catch {
    return [];
  }
}

function writeAccounts(list: SavedAccount[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // 無視
  }
}

export function upsertAccount(a: SavedAccount) {
  const list = getAccounts().filter((x) => x.id !== a.id);
  list.push(a);
  writeAccounts(list);
}

export function updateAccountTokens(
  id: string,
  accessToken: string,
  refreshToken: string,
  label?: string
) {
  const list = getAccounts();
  const a = list.find((x) => x.id === id);
  if (!a) return;
  a.accessToken = accessToken;
  a.refreshToken = refreshToken;
  if (label) a.label = label;
  a.updatedAt = Date.now();
  writeAccounts(list);
}

export function removeAccount(id: string) {
  writeAccounts(getAccounts().filter((x) => x.id !== id));
}

export function isSaved(id: string) {
  return getAccounts().some((x) => x.id === id);
}

export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode("swm:" + pin);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
