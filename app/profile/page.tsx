"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CreditCard, Download, FileText, Loader2, Settings, UserRound } from "lucide-react";
import { AppHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchProjects, fetchUsageQuota, toAbsoluteApiUrl, type ProjectSummary, type UsageQuota } from "@/lib/api";
import { readStoredAuthUser, type AuthUser } from "@/lib/auth";

function statusLabel(status: string) {
  if (status === "exported") return "已导出 PDF";
  if (status === "generated") return "已生成";
  if (status === "editing") return "编辑中";
  if (status === "export_failed") return "导出未通过";
  return status || "草稿";
}

function formatTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}

export default function ProfilePage() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [usageQuota, setUsageQuota] = useState<UsageQuota | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = readStoredAuthUser();
    setAuthUser(storedUser);
    if (!storedUser) {
      setProjects([]);
      setLoading(false);
      return;
    }
    void fetchProjects(storedUser.user_id)
      .then((items) => {
        setProjects(items);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "项目列表加载失败"))
      .finally(() => setLoading(false));
    void fetchUsageQuota(storedUser.user_id).then(setUsageQuota).catch(() => undefined);
  }, []);

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader />
      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">个人中心</h1>
            <p className="text-sm text-muted-foreground">按邮箱账号读取已生成文章、PDF 导出和只读预览状态。</p>
          </div>
          <Button asChild>
            <Link href="/">新建生成</Link>
          </Button>
        </div>

        {!authUser ? (
          <Card>
            <CardHeader>
              <CardTitle>需要登录</CardTitle>
              <CardDescription>请先通过邮箱验证码登录，再查看自己的文章和额度。</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/login">邮箱验证码登录</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {authUser ? (
          <>
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserRound className="h-5 w-5 text-primary" />
                  账号
                </CardTitle>
                <CardDescription>{authUser.email}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">项目数</span>
                  <span className="font-medium">{projects.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">数据库</span>
                  <Badge variant="success">SQLite</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">剩余额度</span>
                  <span className="font-medium">{usageQuota?.remaining_total ?? "-"} 次</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">免费额度</span>
                  <span className="font-medium">{usageQuota?.remaining_free ?? "-"}/{usageQuota?.free_total ?? 3}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  支付状态
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-md border bg-white p-3">
                  <div className="font-medium">当前版本</div>
                  <div className="mt-1 text-muted-foreground">
                    已接入本地额度数据库：每个注册用户 3 次免费生成，之后暂定 99 元/次；正式支付回调仍需接入商户平台。
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                已保存文章
              </CardTitle>
              <CardDescription>生成后会自动保存到数据库，可在工作台直接预览 PDF。</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-2 rounded-md border bg-white p-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在加载项目
                </div>
              ) : error ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</div>
              ) : projects.length === 0 ? (
                <div className="rounded-md border border-dashed bg-white p-8 text-center text-sm text-muted-foreground">
                  还没有保存的文章。回到首页上传材料并生成后，这里会出现真实记录。
                </div>
              ) : (
                <div className="overflow-hidden rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted text-left">
                      <tr>
                        <th className="px-4 py-3 font-medium">标题</th>
                        <th className="px-4 py-3 font-medium">模板</th>
                        <th className="px-4 py-3 font-medium">状态</th>
                        <th className="px-4 py-3 font-medium">材料</th>
                        <th className="px-4 py-3 font-medium">更新时间</th>
                        <th className="px-4 py-3 font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y bg-white">
                      {projects.map((project) => {
                        const pdfUrl = toAbsoluteApiUrl(project.pdf_url ?? null);
                        return (
                          <tr key={project.project_id}>
                            <td className="max-w-[320px] px-4 py-3 font-medium">
                              <div className="line-clamp-2">{project.title}</div>
                              <div className="mt-1 text-xs text-muted-foreground">{project.project_id}</div>
                            </td>
                            <td className="px-4 py-3">{project.template_id}</td>
                            <td className="px-4 py-3">
                              <Badge variant={project.compile_succeeded ? "success" : "outline"}>{statusLabel(project.status)}</Badge>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{project.source_file_count}</td>
                            <td className="px-4 py-3 text-muted-foreground">{formatTime(project.updated_at)}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                <Button asChild variant="outline" size="sm">
                                  <Link href={`/work?project=${encodeURIComponent(project.project_id)}`}>打开</Link>
                                </Button>
                                {pdfUrl ? (
                                  <Button asChild variant="ghost" size="sm">
                                    <a href={pdfUrl} target="_blank" rel="noreferrer">
                                      <Download className="h-4 w-4" />
                                      PDF
                                    </a>
                                  </Button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              后续设置
            </CardTitle>
          <CardDescription>后续可加入登录用户、团队空间、云数据库、支付二维码、商户回调和导出水印设置。</CardDescription>
          </CardHeader>
        </Card>
          </>
        ) : null}
      </section>
    </main>
  );
}
