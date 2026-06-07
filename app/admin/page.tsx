"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileText, Loader2, RefreshCw, Route, Shield, UserRound, XCircle } from "lucide-react";
import { AppHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchAdminOverview,
  fetchAdminProjectDetail,
  type AdminOverview,
  type AdminProjectDetail,
  type AdminProjectSummary,
  type AdminReviewStep
} from "@/lib/api";

const ADMIN_KEY_STORAGE = "mi-writing-admin-key-v1";

function formatTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}

function statusVariant(status: string): "outline" | "success" | "warning" {
  if (status === "validated" || status === "llm_generated") return "success";
  if (status === "fallback_generated" || status === "export_failed") return "warning";
  return "outline";
}

function statusLabel(status: string) {
  if (status === "validated") return "已验证";
  if (status === "llm_generated") return "模型生成";
  if (status === "fallback_generated") return "回退";
  if (status === "exported") return "已导出";
  if (status === "generated") return "已生成";
  if (status === "export_failed") return "导出失败";
  return status || "未知";
}

function compactJson(value: unknown) {
  if (value === null || value === undefined || value === "") return "暂无记录";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminProjectDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setAdminKey(window.sessionStorage.getItem(ADMIN_KEY_STORAGE) ?? "");
    } catch {
      setAdminKey("");
    }
  }, []);

  const selectedProject = useMemo(
    () => overview?.projects.find((project) => project.project_id === selectedProjectId) ?? overview?.projects[0] ?? null,
    [overview, selectedProjectId]
  );

  useEffect(() => {
    if (!selectedProjectId && selectedProject?.project_id) {
      setSelectedProjectId(selectedProject.project_id);
    }
  }, [selectedProject, selectedProjectId]);

  useEffect(() => {
    if (!adminKey || !selectedProjectId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    void fetchAdminProjectDetail(adminKey, selectedProjectId)
      .then((payload) => {
        if (!cancelled) setDetail(payload);
      })
      .catch((err) => {
        if (!cancelled) setDetailError(err instanceof Error ? err.message : "项目复核记录加载失败");
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [adminKey, selectedProjectId]);

  async function loadOverview() {
    if (!adminKey.trim()) {
      setError("请输入后端 ADMIN_API_KEY。");
      return;
    }
    try {
      window.sessionStorage.setItem(ADMIN_KEY_STORAGE, adminKey.trim());
    } catch {
      // Session storage is optional.
    }
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchAdminOverview(adminKey.trim(), 200);
      setOverview(payload);
      setSelectedProjectId((current) =>
        current && payload.projects.some((project) => project.project_id === current)
          ? current
          : payload.projects[0]?.project_id ?? null
      );
    } catch (err) {
      setOverview(null);
      setError(err instanceof Error ? err.message : "后台数据加载失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <AppHeader />
      <section className="mx-auto grid max-w-7xl gap-4 px-6 py-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="rounded-md border bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <Shield className="h-4 w-4 text-primary" />
              后端管理面板
            </div>
            <div className="mt-2 text-xs leading-5 text-muted-foreground">
              查看注册账号、文章生成记录和每篇文章的复核过程。访问需要后端 `ADMIN_API_KEY`。
            </div>
            <div className="mt-4 space-y-2">
              <Input
                type="password"
                value={adminKey}
                onChange={(event) => setAdminKey(event.target.value)}
                placeholder="输入 ADMIN_API_KEY"
              />
              <Button type="button" className="w-full" onClick={() => void loadOverview()} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                加载后台数据
              </Button>
            </div>
            {error ? <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{error}</div> : null}
          </section>

          <section className="rounded-md border bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <UserRound className="h-4 w-4 text-primary" />
              注册账号
            </div>
            <div className="mt-3 space-y-2">
              {overview?.users.length ? (
                overview.users.map((user) => (
                  <div key={user.user_id} className="rounded-md border bg-slate-50 p-3 text-xs leading-5">
                    <div className="font-medium text-slate-950">{user.email}</div>
                    <div className="text-muted-foreground">ID：{user.user_id}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge variant={user.has_password ? "success" : "outline"}>{user.has_password ? "密码账号" : "邮箱验证码"}</Badge>
                      <Badge variant="outline">文章 {user.project_count}</Badge>
                    </div>
                    <div className="mt-1 text-muted-foreground">注册：{formatTime(user.created_at)}</div>
                    <div className="text-muted-foreground">最近登录：{formatTime(user.last_login_at)}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-dashed bg-slate-50 p-3 text-xs text-muted-foreground">
                  {overview ? "暂无注册账号。" : "加载后显示账号信息。"}
                </div>
              )}
            </div>
          </section>
        </aside>

        <section className="space-y-4">
          <StatsBand overview={overview} loading={loading} />

          <section className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
            <div className="rounded-md border bg-white">
              <div className="border-b p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                  <FileText className="h-4 w-4 text-primary" />
                  生成文章
                </div>
                <div className="mt-1 text-xs text-muted-foreground">按更新时间展示所有账号文章。</div>
              </div>
              <div className="max-h-[720px] overflow-y-auto p-3">
                {overview?.projects.length ? (
                  <div className="space-y-2">
                    {overview.projects.map((project) => (
                      <ProjectButton
                        key={project.project_id}
                        project={project}
                        active={project.project_id === selectedProjectId}
                        onClick={() => setSelectedProjectId(project.project_id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed bg-slate-50 p-4 text-sm text-muted-foreground">
                    {overview ? "暂无生成文章。" : "加载后显示文章记录。"}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-md border bg-white">
              <div className="border-b p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                  <Route className="h-4 w-4 text-primary" />
                  复核过程
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  查看材料评分、LLM 重试、图像生成、统计图、导出和工作流审计。
                </div>
              </div>
              <div className="p-4">
                {detailLoading ? (
                  <div className="flex items-center gap-2 rounded-md border bg-slate-50 p-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    正在加载复核过程
                  </div>
                ) : detailError ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{detailError}</div>
                ) : detail ? (
                  <ProjectReview detail={detail} />
                ) : (
                  <div className="rounded-md border border-dashed bg-slate-50 p-4 text-sm text-muted-foreground">
                    选择一篇文章查看复核过程。
                  </div>
                )}
              </div>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}

function StatsBand({ overview, loading }: { overview: AdminOverview | null; loading: boolean }) {
  const stats = overview?.stats;
  const cells = [
    ["注册账号", stats?.user_count ?? 0],
    ["文章记录", stats?.project_count ?? 0],
    ["已导出", stats?.exported_count ?? 0],
    ["PDF 成功", stats?.compile_success_count ?? 0]
  ];
  return (
    <section className="grid gap-3 sm:grid-cols-4">
      {cells.map(([label, value]) => (
        <div key={label} className="rounded-md border bg-white p-4">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl font-semibold text-slate-950">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : value}
          </div>
        </div>
      ))}
    </section>
  );
}

function ProjectButton({
  project,
  active,
  onClick
}: {
  project: AdminProjectSummary;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-md border p-3 text-left transition-colors ${
        active ? "border-primary bg-primary/5" : "bg-white hover:bg-slate-50"
      }`}
    >
      <div className="line-clamp-2 text-sm font-medium text-slate-950">{project.title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{project.user_email || project.user_id}</div>
      <div className="mt-2 flex flex-wrap gap-1">
        <Badge variant={project.review.compile_succeeded ? "success" : "outline"}>PDF</Badge>
        <Badge variant={project.review.audit_passed ? "success" : "warning"}>
          {project.review.audit_passed ? "审计通过" : "需复核"}
        </Badge>
        {project.review.figure_fallback_used ? <Badge variant="warning">图像回退</Badge> : null}
      </div>
      <div className="mt-2 text-xs text-muted-foreground">更新：{formatTime(project.updated_at)}</div>
    </button>
  );
}

function ProjectReview({ detail }: { detail: AdminProjectDetail }) {
  const summary = detail.review_process.summary;
  const material = detail.review_process.material_assessment;
  const figure = detail.review_process.figure_generation;
  return (
    <div className="space-y-4">
      <div className="grid gap-2 text-xs sm:grid-cols-3">
        <InfoCell label="账号" value={detail.user.email || detail.user.user_id} />
        <InfoCell label="模板" value={detail.project.template_id} />
        <InfoCell label="项目" value={detail.project.project_id} />
      </div>
      <div className="grid gap-2 text-xs sm:grid-cols-3">
        <InfoCell label="审计项" value={`${summary.audit_item_count} 项`} />
        <InfoCell label="模型生成步骤" value={`${summary.llm_generated_step_count} 个`} />
        <InfoCell label="回退步骤" value={`${summary.fallback_step_count} 个`} />
      </div>

      {material ? (
        <section className="rounded-md border bg-slate-50 p-3 text-xs leading-5">
          <div className="font-medium text-slate-950">材料复核</div>
          <div className="mt-1 text-muted-foreground">
            {material.label}；评分 {material.score}/100；主数据集：{material.primary_dataset_name || "-"}
          </div>
          {material.missing_items.length ? <CompactList title="缺失项" items={material.missing_items} /> : null}
          {material.recommendations.length ? <CompactList title="优化建议" items={material.recommendations} /> : null}
        </section>
      ) : null}

      {figure ? (
        <section className="rounded-md border bg-slate-50 p-3 text-xs leading-5">
          <div className="font-medium text-slate-950">架构图生成</div>
          <div className="mt-1 text-muted-foreground">
            模型：{String(figure.model ?? "-")}；路径：{String(figure.image_path ?? "-")}；
            {figure.fallback_used ? "使用 PNG 回退" : "模型生成"}
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-2 text-xs font-medium text-slate-900">步骤记录</div>
        <div className="space-y-2">
          {detail.review_process.workflow_steps.map((step) => (
            <ReviewStep key={`${step.order}-${step.stage_id}`} step={step} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ReviewStep({ step }: { step: AdminReviewStep }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border bg-white p-3 text-xs">
      <button type="button" className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setOpen((value) => !value)}>
        <div>
          <div className="flex items-center gap-2">
            {step.status === "fallback_generated" ? (
              <XCircle className="h-4 w-4 text-amber-600" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            )}
            <span className="font-medium text-slate-950">{step.stage_name}</span>
            <Badge variant={statusVariant(step.status)}>{statusLabel(step.status)}</Badge>
          </div>
          <div className="mt-1 text-muted-foreground">{step.summary || step.stage_id}</div>
        </div>
        <span className="text-muted-foreground">{open ? "收起" : "详情"}</span>
      </button>
      {open ? (
        <pre className="mt-3 max-h-[360px] overflow-auto rounded-md bg-slate-950 p-3 text-[11px] leading-5 text-slate-100">
          {compactJson(step.content)}
        </pre>
      ) : null}
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-md border bg-slate-50 p-3">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium text-slate-900">{String(value ?? "-")}</div>
    </div>
  );
}

function CompactList({ title, items }: { title: string; items: unknown[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-2">
      <div className="font-medium text-slate-900">{title}</div>
      <ul className="mt-1 space-y-1 text-muted-foreground">
        {items.slice(0, 8).map((item, index) => (
          <li key={index}>{String(item)}</li>
        ))}
      </ul>
    </div>
  );
}
