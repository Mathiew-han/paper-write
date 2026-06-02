import Link from "next/link";
import { KeyRound, NotebookText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-slate-50 lg:grid-cols-[1fr_460px]">
      <section className="hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
            <NotebookText className="h-5 w-5" />
          </div>
          <div className="font-semibold">医学影像论文写作助手</div>
        </Link>
        <div>
          <h1 className="max-w-lg text-3xl font-semibold tracking-normal">
            登录后继续编辑论文、管理数据集和查看支付状态。
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-primary-foreground/75">
            每篇文章会保存数据集画像、分类结果、LaTeX 模板、画板内容和导出版本。
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-10">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>登录 / 注册</CardTitle>
            <CardDescription>当前为前端原型，后续接入 FastAPI 认证接口。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="邮箱 / 手机号" />
            <Input placeholder="密码" type="password" />
            <Button className="w-full">
              <KeyRound className="h-4 w-4" />
              登录
            </Button>
            <Button variant="outline" className="w-full">
              注册新账号
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              <Link href="/" className="hover:text-primary">
                返回首页
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
