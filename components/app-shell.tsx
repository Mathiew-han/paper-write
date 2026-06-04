"use client";

import Link from "next/link";
import { LogIn, LogOut, NotebookText, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { clearStoredAuthUser, readStoredAuthUser, type AuthUser } from "@/lib/auth";

export function AppHeader() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setAuthUser(readStoredAuthUser());
  }, []);

  function handleLogout() {
    clearStoredAuthUser();
    setAuthUser(null);
    window.location.href = "/login";
  }

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <NotebookText className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold">医学影像论文写作助手</div>
            <div className="text-xs text-muted-foreground">Dataset-first manuscript workspace</div>
          </div>
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">首页</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/work">工作台</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/profile">
              <UserRound className="h-4 w-4" />
              个人
            </Link>
          </Button>
          {authUser ? (
            <Button variant="ghost" size="sm" onClick={handleLogout} title={authUser.email}>
              <LogOut className="h-4 w-4" />
              退出
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href="/login">
                <LogIn className="h-4 w-4" />
                登录
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
