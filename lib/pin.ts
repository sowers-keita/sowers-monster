import { supabase } from "@/lib/supabaseClient";

// 保護者暗証番号（DBのprofiles.parent_pinに保存）
// 端末が変わっても有効。未設定なら null を返す。

export async function getParentPin(): Promise<string | null> {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) {
    return null;
  }

  const { data } = await supabase
    .from("profiles")
    .select("parent_pin")
    .eq("id", userId)
    .maybeSingle();

  let pin = (data?.parent_pin as string | null) ?? null;

  // 旧バージョン（端末保存）からの引き継ぎ
  if (!pin && typeof window !== "undefined") {
    const legacy = localStorage.getItem("parentPin");
    if (legacy && /^[0-9]{4}$/.test(legacy)) {
      const ok = await setParentPin(legacy);
      if (ok) {
        pin = legacy;
      }
    }
  }

  return pin;
}

export async function setParentPin(pin: string): Promise<boolean> {
  if (!/^[0-9]{4}$/.test(pin)) {
    return false;
  }

  const { error } = await supabase.rpc("set_parent_pin", { p_pin: pin });
  if (error) {
    return false;
  }

  try {
    localStorage.setItem("parentPin", pin);
  } catch {
    // 保存できなくても続行
  }

  return true;
}
