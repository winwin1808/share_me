import type { ReactNode } from "react";

export function SplitLayout({
  sidebar,
  children
}: {
  sidebar: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">{sidebar}</aside>
      <main className="app-workspace">{children}</main>
    </div>
  );
}

