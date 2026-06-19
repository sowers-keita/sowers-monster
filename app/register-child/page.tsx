"use client";

import Phone from "@/components/Phone";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function RegisterChildPage() {
  const router = useRouter();

  const [parentName, setParentName] = useState("");
  const [childName, setChildName] = useState("");
  const [classroomName, setClassroomName] = useState("sowers");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      return;
    }
    // セッションがあってもサーバーで本人確認する。
    // （アカウント削除後など、無効な古いセッションが残っていると
    //   「ログイン済み」と誤判定して新規登録できなくなるため）
    const { data: userData, error } = await supabase.auth.getUser();
    if (error || !userData.user) {
      await supabase.auth.signOut();
      setLoggedIn(false);
      return;
    }
    setLoggedIn(true);
  }

  async function register() {
    if (saving) {
      return;
    }

    if (!parentName || !childName) {
      alert("保護者名と子どもの名前を入力してください");
      return;
    }

    setSaving(true);

    // すでにログイン済みならそのユーザーを使う。
    // 未ログインなら新規登録（既にアカウントがあればログインで継続）。
    let userId: string | null = null;

    const { data: userData } = await supabase.auth.getUser();
    userId = userData.user?.id ?? null;

    if (!userId) {
      if (!email || !password) {
        alert("メールアドレスとパスワードを入力してください");
        setSaving(false);
        return;
      }

      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({ email, password });

      if (signUpError) {
        // 既にアカウントがある場合などはログインを試す
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({ email, password });

        if (signInError || !signInData.user) {
          alert(
            "このメールアドレスは既に登録されています。パスワードが正しいかご確認ください。"
          );
          setSaving(false);
          return;
        }

        userId = signInData.user.id;
      } else {
        userId = signUpData.user?.id ?? null;
      }
    }

    if (!userId) {
      alert("ユーザー情報の取得に失敗しました");
      setSaving(false);
      return;
    }

    // プロフィール（保護者）を作成・更新
    // 既存が管理者(admin)の場合は降格させない（管理者がテストで子登録しても権限維持）
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    const keepRole = existingProfile?.role === "admin" ? "admin" : "parent";

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({ id: userId, name: parentName, role: keepRole });

    if (profileError) {
      alert(profileError.message);
      setSaving(false);
      return;
    }

    // 教室を取得（schema.sqlで初期登録済み）
    const { data: classroom } = await supabase
      .from("classrooms")
      .select("id")
      .eq("name", classroomName)
      .maybeSingle();

    let classroomId = classroom?.id ?? null;

    if (!classroomId) {
      const { data: newClassroom, error: classroomError } = await supabase
        .from("classrooms")
        .insert({
          name: classroomName,
          type:
            classroomName === "sowers"
              ? "Sowers Club"
              : classroomName === "keyダンス"
              ? "ダンス教室"
              : "体操教室"
        })
        .select("id")
        .single();

      if (classroomError) {
        alert(classroomError.message);
        setSaving(false);
        return;
      }

      classroomId = newClassroom.id;
    }

    // すでに子どもが登録済みなら重複作成しない
    const { data: existingChild } = await supabase
      .from("children")
      .select("id")
      .eq("parent_id", userId)
      .limit(1)
      .maybeSingle();

    if (!existingChild) {
      const { error: childError } = await supabase.from("children").insert({
        parent_id: userId,
        name: childName,
        classroom_id: classroomId
      });

      if (childError) {
        alert(childError.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    router.push("/egg-select");
  }

  return (
    <Phone title="子ども登録">
      <div className="card">
        <div className="title">基本情報</div>

        {loggedIn && (
          <div className="note" style={{ marginBottom: 8 }}>
            ログイン済みです。子どもの情報を入力して続けてください。
          </div>
        )}

        <label className="label">保護者名</label>
        <input
          className="input"
          value={parentName}
          onChange={(event) => setParentName(event.target.value)}
          placeholder="例：山田 太郎"
        />

        <label className="label">子どもの名前</label>
        <input
          className="input"
          value={childName}
          onChange={(event) => setChildName(event.target.value)}
          placeholder="例：たろう"
        />

        <label className="label">所属教室</label>
        <select
          className="input"
          value={classroomName}
          onChange={(event) => setClassroomName(event.target.value)}
        >
          <option>sowers</option>
          <option>論田体操</option>
          <option>北島体操</option>
          <option>小松島体操</option>
          <option>阿南体操</option>
          <option>上板体操</option>
          <option>吉野川体操</option>
          <option>keyダンス</option>
        </select>

        {!loggedIn && (
          <>
            <label className="label">メールアドレス</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <label className="label">パスワード</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </>
        )}

        <button className="button" onClick={register} disabled={saving}>
          {saving ? "登録中…" : "登録して卵を選ぶ"}
        </button>
      </div>
    </Phone>
  );
}
