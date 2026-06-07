"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

function clearClientState() {
  try {
    window.localStorage.removeItem("mi-writing-auth-user-v1");
    window.localStorage.removeItem("mi-writing-home-draft-v1");
    window.localStorage.removeItem("mi-writing-generation-job-v1");
  } catch {
    // Storage can be unavailable in some browser modes.
  }
}

export default function ErrorPage({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-lg rounded-lg border bg-white p-6 shadow-soft">
        <div className="text-base font-semibold text-slate-950">页面运行状态需要刷新</div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          浏览器可能仍保留了旧版本页面状态。清理本站临时缓存后会重新加载，不会删除服务器上已经生成的文章。
        </p>
        {error?.message ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            {error.message}
          </div>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => {
              clearClientState();
              reset();
            }}
          >
            清理并重试
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              clearClientState();
              window.location.href = "/";
            }}
          >
            返回首页
          </Button>
        </div>
      </div>
    </main>
  );
}
