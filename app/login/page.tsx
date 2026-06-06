"use client";

import Script from "next/script";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  NotebookText,
  ShieldCheck,
  UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  loginWithPassword,
  registerWithPassword,
  sendEmailLoginCode,
  verifyEmailLoginCode
} from "@/lib/api";
import { writeStoredAuthUser } from "@/lib/auth";

type AuthMode = "login" | "register" | "code";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          theme?: "light" | "dark";
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove?: (widgetId: string) => void;
    };
  }
}

function normalizeCode(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

export default function LoginPage() {
  const router = useRouter();
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  const turnstileRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [deliveryMessage, setDeliveryMessage] = useState<string | null>(null);
  const [turnstileOpen, setTurnstileOpen] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [isScriptReady, setIsScriptReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeReady = code.length === 6;

  useEffect(() => {
    if (!turnstileOpen || !turnstileSiteKey || !isScriptReady || !turnstileRef.current || !window.turnstile) {
      return;
    }

    if (turnstileWidgetIdRef.current) {
      window.turnstile.reset(turnstileWidgetIdRef.current);
      return;
    }

    turnstileWidgetIdRef.current = window.turnstile.render(turnstileRef.current, {
      sitekey: turnstileSiteKey,
      theme: "light",
      callback: (token) => {
        setTurnstileToken(token);
        setError(null);
      },
      "expired-callback": () => {
        setTurnstileToken("");
        setError("人机验证已过期，请重新验证。");
      },
      "error-callback": () => {
        setTurnstileToken("");
        setError("人机验证加载失败，请刷新后重试。");
      }
    });
  }, [turnstileOpen, turnstileSiteKey, isScriptReady]);

  function resetFeedback() {
    setError(null);
    setDeliveryMessage(null);
    setDevCode(null);
  }

  function persistSession(session: { user_id: string; email: string; auth_token: string }) {
    writeStoredAuthUser({ user_id: session.user_id, email: session.email, auth_token: session.auth_token });
    router.push("/");
  }

  async function handlePasswordLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetFeedback();
    setIsSubmitting(true);
    try {
      const session = await loginWithPassword({ email: email.trim(), password });
      persistSession(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOpenRegisterVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetFeedback();
    if (password.length < 8) {
      setError("密码至少需要 8 位。");
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError("密码需同时包含字母和数字。");
      return;
    }
    if (password !== passwordConfirm) {
      setError("两次输入的密码不一致。");
      return;
    }
    setTurnstileToken("");
    setTurnstileOpen(true);
  }

  async function handlePasswordRegister() {
    if (!turnstileSiteKey) {
      setError("前端尚未配置 NEXT_PUBLIC_TURNSTILE_SITE_KEY，暂不能注册。");
      return;
    }
    if (!turnstileToken) {
      setError("请先完成人机验证。");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const session = await registerWithPassword({
        email: email.trim(),
        password,
        passwordConfirm,
        turnstileToken
      });
      persistSession(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败");
      setTurnstileToken("");
      if (window.turnstile && turnstileWidgetIdRef.current) {
        window.turnstile.reset(turnstileWidgetIdRef.current);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSending(true);
    resetFeedback();
    try {
      const result = await sendEmailLoginCode({ email: email.trim() });
      setDeliveryMessage(result.message);
      setDevCode(result.dev_code ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "验证码发送失败");
    } finally {
      setIsSending(false);
    }
  }

  async function handleVerifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!codeReady) {
      setError("请输入 6 位邮箱验证码。");
      return;
    }
    setIsVerifying(true);
    setError(null);
    try {
      const session = await verifyEmailLoginCode({ email: email.trim(), code });
      persistSession(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "验证码校验失败");
    } finally {
      setIsVerifying(false);
    }
  }

  const tabClass = (tab: AuthMode) =>
    `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
      mode === tab ? "bg-primary text-primary-foreground" : "text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <main className="grid min-h-screen bg-slate-50 lg:grid-cols-[1fr_480px]">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setIsScriptReady(true)}
      />

      <section className="hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
            <NotebookText className="h-5 w-5" />
          </div>
          <div className="font-semibold">医学影像论文写作助手</div>
        </Link>
        <div>
          <h1 className="max-w-lg text-3xl font-semibold tracking-normal">
            登录后继续生成论文、查看项目并管理使用额度。
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-primary-foreground/75">
            注册账号会先完成人机验证；邮箱验证码登录保留为备用入口。
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-10">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{mode === "login" ? "账号登录" : mode === "register" ? "注册账号" : "邮箱验证码登录"}</CardTitle>
            <CardDescription>
              {mode === "login"
                ? "使用邮箱和密码登录。"
                : mode === "register"
                  ? "填写邮箱和两次密码，点击注册后完成人机验证。"
                  : "输入邮箱获取 6 位验证码；旧账号仍可使用该方式登录。"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-1 rounded-lg border bg-white p-1">
              <button type="button" className={tabClass("login")} onClick={() => setMode("login")}>
                登录
              </button>
              <button type="button" className={tabClass("register")} onClick={() => setMode("register")}>
                注册
              </button>
              <button type="button" className={tabClass("code")} onClick={() => setMode("code")}>
                验证码
              </button>
            </div>

            {mode === "login" ? (
              <form className="space-y-3" onSubmit={handlePasswordLogin}>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-900">邮箱</span>
                  <Input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@example.com"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-900">密码</span>
                  <Input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="至少 8 位，包含字母和数字"
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </label>
                <Button className="w-full" type="submit" disabled={isSubmitting || !email.trim() || !password}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                  登录
                </Button>
              </form>
            ) : null}

            {mode === "register" ? (
              <form className="space-y-3" onSubmit={handleOpenRegisterVerification}>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-900">邮箱</span>
                  <Input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@example.com"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-900">密码</span>
                  <Input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="至少 8 位，包含字母和数字"
                    type="password"
                    autoComplete="new-password"
                    required
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-900">重复密码</span>
                  <Input
                    value={passwordConfirm}
                    onChange={(event) => setPasswordConfirm(event.target.value)}
                    placeholder="再次输入密码"
                    type="password"
                    autoComplete="new-password"
                    required
                  />
                </label>
                <Button className="w-full" type="submit" disabled={isSubmitting || !email.trim() || !password || !passwordConfirm}>
                  <UserPlus className="h-4 w-4" />
                  注册
                </Button>
              </form>
            ) : null}

            {mode === "code" ? (
              <div className="space-y-4">
                <form className="space-y-3" onSubmit={handleSendCode}>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-900">邮箱</span>
                    <Input
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="name@example.com"
                      type="email"
                      autoComplete="email"
                      required
                    />
                  </label>
                  <Button className="w-full" type="submit" disabled={isSending || !email.trim()}>
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                    发送验证码
                  </Button>
                </form>

                {deliveryMessage ? (
                  <div className="rounded-md border bg-slate-50 p-3 text-sm text-slate-700">{deliveryMessage}</div>
                ) : null}
                {devCode ? (
                  <button
                    type="button"
                    onClick={() => setCode(devCode)}
                    className="w-full rounded-md border border-emerald-200 bg-emerald-50 p-3 text-left text-sm text-emerald-800"
                  >
                    本地测试验证码：<span className="font-semibold tracking-[0.2em]">{devCode}</span>
                  </button>
                ) : null}

                <form className="space-y-3" onSubmit={handleVerifyCode}>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-900">验证码</span>
                    <Input
                      value={code}
                      onChange={(event) => setCode(normalizeCode(event.target.value))}
                      placeholder="6 位数字"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                    />
                  </label>
                  <Button className="w-full" type="submit" disabled={isVerifying || !email.trim() || !codeReady}>
                    {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
                    验证登录
                  </Button>
                </form>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{error}</div>
            ) : null}

            <div className="text-center text-sm text-muted-foreground">
              <Link href="/" className="hover:text-primary">
                返回首页
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      {turnstileOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border bg-white p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-950">完成人机验证</div>
                <div className="mt-1 text-xs leading-5 text-muted-foreground">
                  验证通过后将创建账号并自动登录。
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-md border bg-slate-50 p-3">
              {turnstileSiteKey ? (
                <div ref={turnstileRef} className="min-h-[65px]" />
              ) : (
                <div className="text-sm text-amber-800">缺少 NEXT_PUBLIC_TURNSTILE_SITE_KEY，无法加载验证组件。</div>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setTurnstileOpen(false);
                  setTurnstileToken("");
                }}
                disabled={isSubmitting}
              >
                取消
              </Button>
              <Button type="button" onClick={() => void handlePasswordRegister()} disabled={isSubmitting || !turnstileToken}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                创建账号
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
