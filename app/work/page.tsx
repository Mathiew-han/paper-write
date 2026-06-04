"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  FileText,
  Loader2,
  Play,
  RefreshCw,
  Route,
  Search,
  XCircle
} from "lucide-react";
import { AppHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fetchProject,
  fetchProjects,
  fetchProjectSteps,
  runProjectStep,
  toAbsoluteApiUrl,
  type ProjectRecord,
  type ProjectStep,
  type ProjectStepAction,
  type ProjectStepRunResponse,
  type ProjectStepsResponse,
  type ProjectSummary
} from "@/lib/api";
import { readStoredAuthUser, type AuthUser } from "@/lib/auth";

function formatTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}

function statusLabel(status: string, compileSucceeded?: boolean | null) {
  if (compileSucceeded) return "PDF 编译成功";
  if (status === "export_failed") return "PDF 编译未通过";
  if (status === "generated") return "已生成";
  if (status === "exported") return "已导出 PDF";
  if (status === "editing") return "编辑中";
  return status || "项目记录";
}

function stepStatusLabel(status: string) {
  if (status === "validated") return "已完成";
  if (status === "llm_generated") return "模型生成";
  if (status === "fallback_generated") return "已回退";
  if (status === "pending") return "待执行";
  return status || "未知";
}

function stepStatusVariant(status: string): "outline" | "success" | "warning" {
  if (status === "validated" || status === "llm_generated") return "success";
  if (status === "fallback_generated") return "warning";
  return "outline";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return value;
  }
}

function compactJson(value: unknown) {
  if (value === null || value === undefined || value === "") return "暂无详细内容";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function firstText(value: unknown, fallback = "-") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function projectHasPdf(project: ProjectSummary) {
  return Boolean(project.pdf_url);
}

export default function WorkPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-100">
          <AppHeader />
          <div className="flex h-[calc(100vh-4rem)] items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            正在加载工作台
          </div>
        </main>
      }
    >
      <WorkPageInner />
    </Suspense>
  );
}

function WorkPageInner() {
  const searchParams = useSearchParams();
  const queryProjectId = searchParams.get("project");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectListLoading, setProjectListLoading] = useState(true);
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [stepsPayload, setStepsPayload] = useState<ProjectStepsResponse | null>(null);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [projectLoading, setProjectLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runningStepId, setRunningStepId] = useState<string | null>(null);
  const [stepResult, setStepResult] = useState<ProjectStepRunResponse | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    const storedUser = readStoredAuthUser();
    setAuthUser(storedUser);
    setProjectListLoading(true);
    void fetchProjects(storedUser?.user_id)
      .then((items) => {
        setProjects(items);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "项目列表加载失败"))
      .finally(() => setProjectListLoading(false));
  }, [reloadNonce]);

  const selectedProjectId = useMemo(() => {
    if (queryProjectId) return queryProjectId;
    return projects.find(projectHasPdf)?.project_id ?? projects[0]?.project_id ?? null;
  }, [projects, queryProjectId]);

  useEffect(() => {
    if (!selectedProjectId) {
      setProject(null);
      setStepsPayload(null);
      setActiveStepId(null);
      return;
    }

    let cancelled = false;
    setProjectLoading(true);
    setError(null);
    setStepError(null);
    void Promise.all([fetchProject(selectedProjectId), fetchProjectSteps(selectedProjectId)])
      .then(([projectRecord, projectSteps]) => {
        if (cancelled) return;
        setProject(projectRecord);
        setStepsPayload(projectSteps);
        setActiveStepId((current) => {
          if (current && projectSteps.steps.some((item) => item.step_id === current)) return current;
          return projectSteps.steps[0]?.step_id ?? null;
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "项目加载失败");
      })
      .finally(() => {
        if (!cancelled) setProjectLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedProjectId, reloadNonce]);

  const steps = stepsPayload?.steps ?? [];
  const actions = stepsPayload?.available_actions ?? [];
  const activeStep = steps.find((step) => step.step_id === activeStepId) ?? steps[0] ?? null;
  const activeAction = actions.find((action) => action.step_id === activeStep?.step_id);
  const pdfUrl = toAbsoluteApiUrl(project?.export_result?.pdf_url ?? project?.pdf_url ?? null);
  const compileSucceeded = project?.export_result?.compile_succeeded ?? project?.compile_succeeded ?? null;

  async function handleRunStep(step: ProjectStep, action?: ProjectStepAction) {
    if (!project || !action?.enabled || !step.runnable) return;
    setRunningStepId(step.step_id);
    setStepError(null);
    setStepResult(null);
    try {
      const result = await runProjectStep(project.project_id, step.step_id, {
        prompt: project.draft?.message ?? project.title,
        dataSource: project.material_assessment?.data_source,
        collectionMethod: project.material_assessment?.collection_method,
        expectedProblem: project.material_assessment?.expected_problem
      });
      setStepResult(result);
      if (step.step_id === "export_pdf") {
        setReloadNonce((value) => value + 1);
      }
    } catch (err) {
      setStepError(err instanceof Error ? err.message : "单步运行失败");
    } finally {
      setRunningStepId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <AppHeader />

      <section className="grid h-[calc(100vh-4rem)] min-h-[720px] grid-cols-1 overflow-hidden lg:grid-cols-[300px_minmax(0,1fr)_390px]">
        <aside className="min-h-0 border-r bg-white">
          <div className="border-b px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h1 className="text-base font-semibold tracking-normal text-slate-950">PDF 工作台</h1>
                <div className="mt-1 text-xs text-muted-foreground">
                  {authUser ? authUser.email : "本机项目"}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setReloadNonce((value) => value + 1)}
                title="刷新项目列表"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 border-b px-4 py-3 text-xs text-muted-foreground">
            <Search className="h-4 w-4" />
            已保存文章 {projects.length} 个
          </div>

          <div className="min-h-0 overflow-y-auto p-3">
            {projectListLoading ? (
              <div className="flex items-center gap-2 rounded-md border bg-slate-50 p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                正在加载项目
              </div>
            ) : projects.length === 0 ? (
              <div className="rounded-md border border-dashed bg-slate-50 p-4 text-sm text-muted-foreground">
                暂无已生成文章。先回到首页上传材料并生成 PDF。
                <Button asChild className="mt-3 w-full" size="sm">
                  <Link href="/">新建生成</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {projects.map((item) => {
                  const active = item.project_id === selectedProjectId;
                  return (
                    <Link
                      key={item.project_id}
                      href={`/work?project=${encodeURIComponent(item.project_id)}`}
                      className={`block rounded-md border px-3 py-3 transition-colors ${
                        active ? "border-primary bg-primary/5" : "bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="line-clamp-2 text-sm font-medium text-slate-950">{item.title}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{item.template_id}</div>
                        </div>
                        <Badge variant={item.compile_succeeded ? "success" : "outline"}>
                          {item.pdf_url ? "PDF" : "无PDF"}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>{formatTime(item.updated_at)}</span>
                        <span>{item.source_file_count} 材料</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <section className="min-h-0 bg-slate-200">
          <div className="flex h-full flex-col">
            <div className="border-b bg-white px-5 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/profile">
                        <ArrowLeft className="h-4 w-4" />
                        个人中心
                      </Link>
                    </Button>
                    {project ? (
                      <>
                        <Badge variant={compileSucceeded ? "success" : "warning"}>
                          {statusLabel(project.status, compileSucceeded)}
                        </Badge>
                        <Badge variant="outline">{project.template_id}</Badge>
                      </>
                    ) : null}
                  </div>
                  <h2 className="mt-2 line-clamp-1 text-base font-semibold tracking-normal text-slate-950">
                    {project?.title ?? "请选择一个项目"}
                  </h2>
                  {project ? (
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>项目：{project.project_id}</span>
                      <span>更新时间：{formatTime(project.updated_at)}</span>
                      <span>材料：{project.source_files.length} 个</span>
                    </div>
                  ) : null}
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/">新建生成</Link>
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 p-4">
              {projectLoading ? (
                <div className="flex h-full items-center justify-center rounded-md border bg-white text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  正在加载项目 PDF
                </div>
              ) : error ? (
                <div className="flex h-full items-center justify-center rounded-md border border-amber-200 bg-amber-50 p-8 text-sm text-amber-900">
                  <div>
                    <div className="font-medium">工作台加载失败</div>
                    <div className="mt-2">{error}</div>
                  </div>
                </div>
              ) : pdfUrl ? (
                <div className="h-full overflow-hidden rounded-md border bg-white shadow-sm">
                  <iframe title="PDF 工作台预览" src={pdfUrl} className="h-full w-full bg-white" />
                </div>
              ) : (
                <div className="flex h-full items-center justify-center rounded-md border bg-white p-8 text-center text-sm text-muted-foreground">
                  <div>
                    <FileText className="mx-auto h-10 w-10 text-slate-400" />
                    <div className="mt-3 font-medium text-slate-900">该项目暂无可预览 PDF</div>
                    <div className="mt-1 max-w-md">
                      可以在右侧选择“重新导出 PDF”。如果编译仍失败，请查看导出步骤的日志内容。
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="min-h-0 border-l bg-white">
          <div className="border-b px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <Route className="h-4 w-4 text-primary" />
              生成步骤
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              查看本篇文章每一步做了什么；支持的步骤可以单独运行。
            </div>
          </div>

          <div className="grid h-[calc(100%-61px)] min-h-0 grid-rows-[240px_minmax(0,1fr)]">
            <div className="overflow-y-auto border-b p-3">
              {projectLoading ? (
                <div className="flex items-center gap-2 rounded-md border bg-slate-50 p-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在加载步骤
                </div>
              ) : steps.length === 0 ? (
                <div className="rounded-md border border-dashed bg-slate-50 p-3 text-sm text-muted-foreground">
                  暂无工作流步骤记录。
                </div>
              ) : (
                <div className="space-y-2">
                  {steps.map((step) => {
                    const active = step.step_id === activeStep?.step_id;
                    const action = actions.find((item) => item.step_id === step.step_id);
                    return (
                      <button
                        key={`${step.order}-${step.step_id}`}
                        type="button"
                        onClick={() => setActiveStepId(step.step_id)}
                        className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                          active ? "border-primary bg-primary/5" : "bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                              step.status === "validated" || step.status === "llm_generated"
                                ? "bg-emerald-600 text-white"
                                : step.status === "fallback_generated"
                                  ? "bg-amber-500 text-white"
                                  : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {step.status === "validated" || step.status === "llm_generated" ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : step.status === "fallback_generated" ? (
                              <XCircle className="h-3.5 w-3.5" />
                            ) : (
                              step.order
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="line-clamp-1 text-xs font-medium text-slate-950">{step.step_name}</div>
                              {step.runnable && action?.enabled ? <Play className="h-3.5 w-3.5 text-primary" /> : null}
                            </div>
                            <div className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                              {step.summary || stepStatusLabel(step.status)}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="min-h-0 overflow-y-auto p-4">
              {activeStep ? (
                <StepDetail
                  step={activeStep}
                  action={activeAction}
                  running={runningStepId === activeStep.step_id}
                  result={stepResult?.step_id === activeStep.step_id ? stepResult : null}
                  error={stepError}
                  onRun={() => void handleRunStep(activeStep, activeAction)}
                />
              ) : (
                <div className="rounded-md border border-dashed bg-slate-50 p-4 text-sm text-muted-foreground">
                  选择左侧步骤查看详情。
                </div>
              )}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function StepDetail({
  step,
  action,
  running,
  result,
  error,
  onRun
}: {
  step: ProjectStep;
  action?: ProjectStepAction;
  running: boolean;
  result: ProjectStepRunResponse | null;
  error: string | null;
  onRun: () => void;
}) {
  const content = parseMaybeJson(result?.content ?? step.content);
  const summary = result?.summary || step.summary;
  const parsed = asRecord(content);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold tracking-normal text-slate-950">{step.step_name}</h3>
              <Badge variant={stepStatusVariant(result?.status ?? step.status)}>
                {stepStatusLabel(result?.status ?? step.status)}
              </Badge>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">格式：{result?.artifact_format ?? step.artifact_format}</div>
          </div>
          <Button
            type="button"
            size="sm"
            variant={action?.enabled && step.runnable ? "outline" : "ghost"}
            onClick={onRun}
            disabled={running || !action?.enabled || !step.runnable}
            title={action?.description ?? "该步骤当前仅支持查看"}
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : step.runnable ? <Play className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {step.runnable ? action?.label ?? "运行步骤" : "只读"}
          </Button>
        </div>
        <div className="mt-3 rounded-md border bg-slate-50 p-3 text-xs leading-5 text-slate-700">
          {summary || "该步骤尚未产生摘要。"}
        </div>
        {action?.description ? (
          <div className="mt-2 text-xs leading-5 text-muted-foreground">{action.description}</div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">{error}</div>
      ) : null}

      {parsed ? <StructuredContent value={parsed} /> : null}

      <div>
        <div className="mb-2 text-xs font-medium text-slate-900">原始记录</div>
        <pre className="max-h-[420px] overflow-auto rounded-md border bg-slate-950 p-3 text-xs leading-5 text-slate-100">
          {compactJson(content)}
        </pre>
      </div>
    </div>
  );
}

function StructuredContent({ value }: { value: Record<string, unknown> }) {
  const items = Array.isArray(value.items) ? value.items : null;
  const stages = Array.isArray(value.stages) ? value.stages : null;
  const missingItems = Array.isArray(value.missing_items) ? value.missing_items : null;
  const recommendations = Array.isArray(value.recommendations) ? value.recommendations : null;
  const logs = Array.isArray(value.logs) ? value.logs : null;

  return (
    <div className="space-y-3">
      {"category" in value || "problem_type" in value || "data_grade" in value ? (
        <div className="grid gap-2 text-xs sm:grid-cols-2">
          <InfoCell label="研究类别" value={firstText(value.category)} />
          <InfoCell label="问题类型" value={firstText(value.problem_type)} />
          <InfoCell label="数据等级" value={firstText(value.data_grade)} />
          <InfoCell label="大纲层级" value={firstText(value.outline_level)} />
        </div>
      ) : null}

      {"score" in value || "label" in value || "decision" in value ? (
        <div className="grid gap-2 text-xs sm:grid-cols-2">
          <InfoCell label="判断" value={firstText(value.label ?? value.decision)} />
          <InfoCell label="评分" value={value.score === undefined ? "-" : `${value.score}/100`} />
          <InfoCell label="数据来源" value={firstText(value.data_source)} />
          <InfoCell label="收集方式" value={firstText(value.collection_method)} />
        </div>
      ) : null}

      {missingItems ? <CompactList title="缺失项" items={missingItems} /> : null}
      {recommendations ? <CompactList title="优化建议" items={recommendations} /> : null}

      {items ? (
        <div>
          <div className="mb-2 text-xs font-medium text-slate-900">审计项目</div>
          <div className="space-y-2">
            {items.slice(0, 12).map((item, index) => {
              const record = asRecord(item);
              return (
                <div key={index} className="rounded-md border bg-slate-50 p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-900">{firstText(record?.name, `审计项 ${index + 1}`)}</span>
                    <Badge variant={record?.passed ? "success" : "warning"}>{record?.passed ? "通过" : "需复核"}</Badge>
                  </div>
                  {Array.isArray(record?.evidence) ? (
                    <div className="mt-1 text-muted-foreground">{record.evidence.slice(0, 2).join("；")}</div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {stages ? (
        <div>
          <div className="mb-2 text-xs font-medium text-slate-900">Agent 步骤</div>
          <div className="space-y-2">
            {stages.slice(0, 12).map((stage, index) => {
              const record = asRecord(stage);
              return (
                <div key={index} className="rounded-md border bg-slate-50 p-3 text-xs leading-5">
                  <div className="font-medium text-slate-900">{firstText(record?.stage_name, `步骤 ${index + 1}`)}</div>
                  <div className="mt-1 text-muted-foreground">{firstText(record?.objective)}</div>
                  {Array.isArray(record?.skill_names) && record.skill_names.length ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {record.skill_names.slice(0, 5).map((skill) => (
                        <Badge key={String(skill)} variant="outline">
                          {String(skill)}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {logs ? <CompactList title="编译日志" items={logs.slice(0, 12)} /> : null}
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
    <div>
      <div className="mb-2 text-xs font-medium text-slate-900">{title}</div>
      <ul className="space-y-1 rounded-md border bg-slate-50 p-3 text-xs leading-5 text-slate-700">
        {items.slice(0, 10).map((item, index) => (
          <li key={index}>{String(item)}</li>
        ))}
      </ul>
    </div>
  );
}
