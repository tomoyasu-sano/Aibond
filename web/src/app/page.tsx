import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Feature icons as simple components
function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" x2="12" y1="19" y2="22"/>
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  );
}

const features = [
  {
    icon: MicIcon,
    title: "リアルタイム文字起こし + 翻訳",
    description: "会話をリアルタイムで文字に起こし、パートナーの言語に翻訳。言葉の壁を越えてスムーズにコミュニケーション。",
  },
  {
    icon: UsersIcon,
    title: "誰が話したか明確に",
    description: "AI話者識別機能で、誰が何を話したかを自動で判別。「言った・言わない」の水掛け論を防ぎます。",
  },
  {
    icon: SparklesIcon,
    title: "AIが会話を自動整理",
    description: "会話が終わったら、AIが内容を要約。大切なポイントを見逃しません。",
  },
  {
    icon: CheckCircleIcon,
    title: "約束を忘れない",
    description: "会話中の約束事をAIが自動抽出。リスト化して管理できるので、大切な約束を忘れません。",
  },
];

const plans = [
  {
    name: "Free",
    price: "¥0",
    period: "",
    description: "まずは試してみたい方に",
    features: [
      "月2時間まで会話記録",
      "リアルタイム翻訳",
      "話者識別",
      "AIサマリー",
    ],
    cta: "無料で始める",
    highlighted: false,
  },
  {
    name: "スタンダード",
    price: "¥1,980",
    period: "/月",
    description: "週1回以上会話する方に",
    features: [
      "月15時間まで会話記録",
      "リアルタイム翻訳",
      "話者識別",
      "AIサマリー",
      "AI相談機能",
    ],
    cta: "スタンダードを始める",
    highlighted: true,
  },
  {
    name: "プレミアム",
    price: "¥4,980",
    period: "/月",
    description: "無制限で使いたい方に",
    features: [
      "無制限の会話記録",
      "リアルタイム翻訳",
      "話者識別",
      "AIサマリー",
      "AI相談機能",
      "優先サポート",
    ],
    cta: "プレミアムを始める",
    highlighted: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary">Aibond</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">ログイン</Button>
            </Link>
            <Link href="/signup">
              <Button>無料で始める</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              言葉の壁を越えて、
              <br />
              <span className="text-primary">大切な人との絆</span>を深める
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              国際パートナーのための会話記録・翻訳アプリ。
              <br className="hidden sm:inline" />
              リアルタイム翻訳とAI整理で、2人のコミュニケーションをサポート。
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-6">
                  無料で始める
                </Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-6">
                  機能を見る
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="bg-muted/50 py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                2人のための機能
              </h2>
              <p className="mt-4 text-muted-foreground">
                言語の違いを乗り越え、深い理解を育むための機能を提供します
              </p>
            </div>
            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <Card key={feature.title} className="border-0 bg-background shadow-md">
                  <CardHeader>
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                料金プラン
              </h2>
              <p className="mt-4 text-muted-foreground">
                あなたに合ったプランをお選びください
              </p>
            </div>
            <div className="mt-16 grid gap-8 md:grid-cols-3">
              {plans.map((plan) => (
                <Card
                  key={plan.name}
                  className={`relative ${
                    plan.highlighted
                      ? "border-primary shadow-lg scale-105"
                      : "border-border"
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-primary px-4 py-1 text-sm font-medium text-primary-foreground">
                        おすすめ
                      </span>
                    </div>
                  )}
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <div className="mt-4">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                    <CardDescription className="mt-2">
                      {plan.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2">
                          <CheckIcon className="h-5 w-5 text-primary" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Link href="/signup" className="mt-8 block">
                      <Button
                        className="w-full"
                        variant={plan.highlighted ? "default" : "outline"}
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-primary py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
              今すぐ始めましょう
            </h2>
            <p className="mt-4 text-lg text-primary-foreground/80">
              無料プランで、まずはお試しください
            </p>
            <Link href="/signup">
              <Button
                size="lg"
                variant="secondary"
                className="mt-8 text-lg px-8 py-6"
              >
                無料で始める
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-primary">Aibond</span>
              <span className="text-sm text-muted-foreground">
                © 2025 Aibond. All rights reserved.
              </span>
            </div>
            <nav className="flex gap-6">
              <Link
                href="/terms"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                利用規約
              </Link>
              <Link
                href="/privacy"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                プライバシーポリシー
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
