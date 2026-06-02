import Link from "next/link";
import { CreditCard, FileText, Settings, UserRound } from "lucide-react";
import { AppHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const manuscripts = [
  ["ADC histogram analysis for tumor differentiation", "QIMS", "编辑中", "今天 21:40"],
  ["CT-derived ECV for clinical outcome prediction", "European Radiology", "已导出 PDF", "昨天 18:12"],
  ["Virtual non-contrast CT replacement study", "Elsevier", "等待支付解锁", "5月30日"]
];

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader />
      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">个人中心</h1>
            <p className="text-sm text-muted-foreground">管理文章、订单、账号和导出记录。</p>
          </div>
          <Button asChild>
            <Link href="/work">新建工作流</Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserRound className="h-5 w-5 text-primary" />
                  账号
                </CardTitle>
                <CardDescription>researcher@example.com</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">套餐</span>
                  <Badge variant="success">试用中</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">剩余额度</span>
                  <span className="font-medium">3 次生成</span>
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
                  <div className="font-medium">单篇论文导出</div>
                  <div className="mt-1 text-muted-foreground">已提交凭证，等待确认</div>
                </div>
                <div className="rounded-md border bg-white p-3">
                  <div className="font-medium">后续增强</div>
                  <div className="mt-1 text-muted-foreground">商户支付 webhook 自动确认</div>
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
              <CardDescription>文章内容、画板、导出文件和版本都会保存在这里。</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-left">
                    <tr>
                      <th className="px-4 py-3 font-medium">标题</th>
                      <th className="px-4 py-3 font-medium">模板</th>
                      <th className="px-4 py-3 font-medium">状态</th>
                      <th className="px-4 py-3 font-medium">更新时间</th>
                      <th className="px-4 py-3 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y bg-white">
                    {manuscripts.map(([title, template, status, updated]) => (
                      <tr key={title}>
                        <td className="px-4 py-3 font-medium">{title}</td>
                        <td className="px-4 py-3">{template}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{updated}</td>
                        <td className="px-4 py-3">
                          <Button asChild variant="outline" size="sm">
                            <Link href="/work">打开</Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              预留设置
            </CardTitle>
            <CardDescription>后续可加入团队、支付二维码、商户回调和导出水印设置。</CardDescription>
          </CardHeader>
        </Card>
      </section>
    </main>
  );
}
