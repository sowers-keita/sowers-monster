"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// QRで種をもらう機能は「ミッション」の あいことば に移動しました。
export default function QrRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/mission");
  }, [router]);

  return (
    <main className="page">
      <div className="phone">
        <div className="header">ミッションへ移動中…</div>
        <div className="content">
          <div className="card">
            <div className="title">読み込み中…</div>
            <div className="note">
              種は「ミッション」の あいことば でもらえるようになりました。
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
