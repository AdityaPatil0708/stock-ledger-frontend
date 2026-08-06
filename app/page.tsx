"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Ledger from "./ledger/Ledger";
import { useAuth } from "./auth/AuthContext";

export default function Home() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return <div style={{ padding: 60, textAlign: "center", color: "var(--ink-soft)" }}>Loading…</div>;
  }

  return (
    <div id="root">
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, alignItems: "center", padding: "10px 0" }}>
        <span className="hint" style={{ margin: 0 }}>
          {user.email} · {user.role === "editor" ? "Editor" : "Viewer"}
        </span>
        <button className="btn btn-ghost btn-sm" onClick={logout}>
          Sign out
        </button>
      </div>
      <Ledger role={user.role} />
    </div>
  );
}
