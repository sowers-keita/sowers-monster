"use client";

import Phone from "@/components/Phone";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterChildPage() {
  const router = useRouter();

  const [parentName, setParentName] = useState("");
  const [childName, setChildName] = useState("");
  const [classroomName, setClassroomName] = useState("徳島体操");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function register() {
    if (!parentName || !childName || !email || !password) {
      alert("未入力の項目があります");
      return;
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password
    });

    if (signUpError) {
      alert(signUpError.message);
      return;
    }

    const userId = signUpData.user?.id;

    if (!userId) {
      alert("ユーザー作成に失敗しました");
      return;
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      name: parentName,
      role: "parent"
    });

    if (profileError) {
      alert(profileError.message);
      return;
    }

    const { data: classroom } = await supabase
      .from("classrooms")
      .select("id")
      .eq("name", classroomName)
      .maybeSingle();

    let classroomId = classroom?.id;

    if (!classroomId) {
      const { data: newClassroom, error: classroomError } = await supabase
        .from("classrooms")
        .insert({
          name: classroomName,
          type: classroomName === "Sowers Club" ? "Sowers Club" : "体操教室"
        })
        .select("id")
        .single();

      if (classroomError) {
        alert(classroomError.message);
        return;
      }

      classroomId = newClassroom.id;
    }

    const { error: childError } = await supabase.from("children").insert({
      parent_id: userId,
      name: childName,
      classroom_id: classroomId
    });

    if (childError) {
      alert(childError.message);
      return;
    }

    router.push("/egg-select");
  }

  return (
    <Phone title="子ども登録">
      <div className="card">
        <div className="title">基本情報</div>

        <label className="label">保護者名</label>
        <input
          className="input"
          value={parentName}
          onChange={(event) => setParentName(event.target.value)}
          placeholder="例：木原 敬太"
        />

        <label className="label">子どもの名前</label>
        <input
          className="input"
          value={childName}
          onChange={(event) => setChildName(event.target.value)}
          placeholder="例：なな"
        />

        <label className="label">所属教室</label>
        <select
          className="input"
          value={classroomName}
          onChange={(event) => setClassroomName(event.target.value)}
        >
          <option>徳島体操</option>
          <option>北島教室</option>
          <option>阿南教室</option>
          <option>吉野川教室</option>
          <option>Sowers Club</option>
        </select>

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

        <button className="button" onClick={register}>
          登録して卵を選ぶ
        </button>
      </div>
    </Phone>
  );
}
