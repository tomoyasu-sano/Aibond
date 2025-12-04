import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HeartCrack, MessageSquareDashed, CalendarX, MessageCircleMore, Users, Hourglass } from "lucide-react";

// Feature icons as simple components
function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

const features = [
  {
    icon: MicIcon,
    title: "リアルタイム文字起こし + 翻訳",
    description: "会話をリアルタイムで文字に起こし、パートナーの言語に翻訳。言葉の壁を越えてスムーズにコミュニケーション。",
    image: "/feature-translation.png"
  },
  {
    icon: UsersIcon,
    title: "誰が話したか明確に",
    description: "AI話者識別機能で、誰が何を話したかを自動で判別。「言った・言わない」の水掛け論を防ぎます。",
    image: "/feature-speaker.png"
  },
  {
    icon: SparklesIcon,
    title: "AIが会話を自動整理",
    description: "会話が終わったら、AIが内容を要約。大切なポイントを見逃しません。",
    image: "/feature-ai.png"
  },
  {
    icon: CheckCircleIcon,
    title: "約束を忘れない",
    description: "会話中の約束事をAIが自動抽出。リスト化して管理できるので、大切な約束を忘れません。",
    image: "/feature-promises.png"
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
      "AI相談機能",
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
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
              Aibond
            </span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">ログイン</Button>
            </Link>
            <Link href="/signup">
              <Button className="shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300">
                無料で始める
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-pink-500/10 z-0"></div>

          {/* Animated background blobs */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>

          <div className="container relative z-10 mx-auto px-4 py-20 md:py-32">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <div className="flex flex-col justify-center space-y-8 animate-fade-in-up">
                <div className="space-y-4">
                  <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none bg-clip-text text-transparent bg-gradient-to-r from-primary via-pink-600 to-rose-500 animate-gradient">
                    ふたりにもっと
                    <br />
                    「分かりあえる」を
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl leading-relaxed">
                    Aibondは、ふたりの会話を記録、分析し、絆を深めるAIパートナー<br />
                    <br />
                    約束事リストの自動作成、お互いの「トリセツ」を作成、パートナー相談にて、より良い関係づくりをサポートします
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/signup">
                    <Button size="lg" className="text-lg px-8 py-6 shadow-lg shadow-primary/25 hover:scale-105 transition-all duration-300 w-full sm:w-auto">
                      無料で始める
                    </Button>
                  </Link>
                  <Link href="#features">
                    <Button variant="outline" size="lg" className="text-lg px-8 py-6 hover:bg-muted/50 w-full sm:w-auto">
                      機能を見る
                    </Button>
                  </Link>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center overflow-hidden">
                        <div className={`w-full h-full bg-gradient-to-br from-primary/${20 + i * 10} to-pink-500/${20 + i * 10}`}></div>
                      </div>
                    ))}
                  </div>
                  <p>多くのカップルが愛用中</p>
                </div>
              </div>
              <div className="relative mx-auto lg:ml-auto w-full max-w-[500px] aspect-[4/3] lg:aspect-square">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-pink-500/20 rounded-[2rem] transform rotate-3 scale-105 blur-2xl"></div>
                <div className="relative rounded-[2rem] overflow-hidden shadow-2xl border border-white/20 w-full h-full group">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10"></div>
                  <Image
                    src="/hero-couple-cafe.png"
                    alt="カフェで楽しく会話するカップルとAibond"
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    priority
                  />

                  {/* Floating UI Elements */}
                  <div className="absolute bottom-6 left-6 right-6 z-20 space-y-3">
                    <div className="bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-lg transform transition-all duration-500 hover:-translate-y-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <p className="text-xs font-medium text-muted-foreground">AI分析中...</p>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        「あなたは料理が得意だから料理、私はお皿洗いの分担でどう?」
                        <span className="block text-xs text-primary mt-1">→ 絆ノート：家事分担の担当をそれぞれ設定しました</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="relative py-20 md:py-32">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
                ふたりの絆を深める機能
              </h2>
              <p className="text-lg text-muted-foreground">
                ただの記録ツールではありません。<br />
                Aibondは、ふたりの理解を深め、より良い関係を築くためのツールです。
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              {[
                {
                  icon: SparklesIcon,
                  title: "AI要約 & 絆ノート",
                  description: "話し合いの内容をAIが自動で要約。「言った・言わない」をなくします。決まった約束やタスクは「絆ノート」に自動転記され、リマインドも行います。",
                  image: "/feature-ai.png"
                },
                {
                  icon: UsersIcon,
                  title: "ふたりの「トリセツ」作成",
                  description: "日々の会話から、パートナーの性格や好みをAIが分析。あなただけの「取扱説明書」を自動で作成・更新し、相手への理解を深めます。",
                  image: "/feature-speaker.png"
                },
                {
                  icon: MessageCircleMore,
                  title: "AIパートナー相談",
                  description: "「最近喧嘩が多い…」そんな時はAIに相談。過去の会話履歴やトリセツをもとに、ふたりの関係を改善するための客観的なアドバイスをくれます。",
                  image: "/feature-promises.png"
                },
                {
                  icon: MicIcon,
                  title: "リアルタイム翻訳 & 記録",
                  description: "言葉の壁があるカップルも安心。高精度なリアルタイム翻訳で会話をサポートします。母国語同士のカップルも、文字起こし機能として活用できます。",
                  image: "/feature-translation.png"
                }
              ].map((feature, index) => (
                <Card
                  key={index}
                  className="group relative overflow-hidden border-border/50 bg-background/50 backdrop-blur-sm transition-all duration-500 hover:shadow-2xl hover:border-primary/50 hover:-translate-y-1"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {feature.image && (
                    <div className="relative w-full h-56 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent z-10 opacity-60"></div>
                      <Image
                        src={feature.image}
                        alt={feature.title}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    </div>
                  )}
                  <CardHeader className="relative z-20">
                    <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-pink-500/20 group-hover:from-primary/30 group-hover:to-pink-500/30 transition-all duration-300 shadow-inner">
                      <feature.icon className="h-7 w-7 text-primary group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <CardTitle className="text-2xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="relative z-20">
                    <CardDescription className="text-base leading-relaxed text-muted-foreground/90">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="py-20 md:py-32 bg-gradient-to-b from-background to-muted/30 relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-[20%] left-[10%] w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-[20%] right-[10%] w-80 h-80 bg-pink-500/5 rounded-full blur-3xl"></div>
          </div>

          <div className="container mx-auto px-4 relative">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
                こんな悩み、ありませんか？
              </h2>
              <p className="text-lg text-muted-foreground">
                Aibondは、あらゆるカップルのコミュニケーション課題を解決します
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
              {[
                {
                  icon: MessageSquareDashed,
                  title: "「言った・言わない」論争",
                  description: "些細な記憶違いから喧嘩になってしまう。過去の会話を客観的に振り返りたい。",
                  color: "text-rose-500",
                  bg: "bg-rose-500/10"
                },
                {
                  icon: CalendarX,
                  title: "約束を忘れてしまう",
                  description: "「今度ここ行こう」という口約束や、頼まれた家事をうっかり忘れて相手を失望させてしまう。",
                  color: "text-orange-500",
                  bg: "bg-orange-500/10"
                },
                {
                  icon: HeartCrack,
                  title: "相手の気持ちがわからない",
                  description: "なぜ怒っているのか、どう接すればいいのかわからない。もっと相手を深く理解したい。",
                  color: "text-blue-500",
                  bg: "bg-blue-500/10"
                },
                {
                  icon: Hourglass,
                  title: "話し合いが平行線",
                  description: "同じような話題で何度も喧嘩してしまう。建設的な話し合いができず、解決策が見つからない。",
                  color: "text-purple-500",
                  bg: "bg-purple-500/10"
                },
                {
                  icon: MessageCircleMore,
                  title: "言葉の壁がある",
                  description: "国際カップルで、細かいニュアンスが伝わらない。もっと深い話を母国語でしたい。",
                  color: "text-green-500",
                  bg: "bg-green-500/10"
                },
                {
                  icon: Users,
                  title: "ふたりの歴史を残したい",
                  description: "日々の何気ない会話や、大切な話し合いの記録を、ふたりの思い出として残しておきたい。",
                  color: "text-amber-500",
                  bg: "bg-amber-500/10"
                }
              ].map((item, index) => (
                <Card key={index} className="group border-border/50 bg-background/60 backdrop-blur-md hover:bg-background/80 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1 h-full ${item.bg.replace('/10', '')} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                  <CardHeader>
                    <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${item.bg} ${item.color} group-hover:scale-110 transition-transform duration-300`}>
                      <item.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-lg font-bold">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-12 text-center">
              <p className="text-lg font-medium mb-6 flex items-center justify-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                Aibondで、理想のパートナーシップを
              </p>
              <Link href="/signup">
                <Button size="lg" className="shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 transition-all duration-300 rounded-full px-8">
                  無料で始める
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 md:py-32 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-primary/10 to-pink-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="container mx-auto px-4 relative">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
                料金プラン
              </h2>
              <p className="text-lg text-muted-foreground">
                あなたに合ったプランをお選びください
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
              {plans.map((plan, index) => (
                <Card
                  key={plan.name}
                  className={`relative backdrop-blur-sm transition-all duration-300 hover:scale-105 ${plan.highlighted
                    ? "border-primary shadow-2xl shadow-primary/20 bg-gradient-to-b from-primary/5 to-background"
                    : "border-border/50 bg-background/50 hover:shadow-xl"
                    }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-gradient-to-r from-primary to-pink-500 px-5 py-1.5 text-sm font-medium text-white shadow-lg">
                        おすすめ
                      </span>
                    </div>
                  )}
                  <CardHeader className="text-center pb-8">
                    <CardTitle className="text-2xl mb-4">{plan.name}</CardTitle>
                    <div className="mb-2">
                      <span className="text-5xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
                        {plan.price}
                      </span>
                      <span className="text-muted-foreground text-lg">{plan.period}</span>
                    </div>
                    <CardDescription className="text-base">
                      {plan.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <ul className="space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                            <CheckIcon className="h-3 w-3 text-primary" />
                          </div>
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Link href="/signup" className="block">
                      <Button
                        className={`w-full py-6 text-base font-medium transition-all duration-300 ${plan.highlighted
                          ? "shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40"
                          : "hover:scale-105"
                          }`}
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

        {/* FAQ Section */}
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
                よくある質問
              </h2>
              <p className="text-lg text-muted-foreground">
                Aibondについて、よくいただく質問にお答えします
              </p>
            </div>

            <div className="max-w-3xl mx-auto space-y-4">
              <Card className="border-0 bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-lg">日本語同士のカップルでも使えますか？</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    はい、もちろんです。Aibondは翻訳だけでなく、会話の記録、AI要約、トリセツ作成など、ふたりの関係を深めるための機能が充実しています。多くの日本人カップルにもご利用いただいています。
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-lg">「トリセツ」はどのように作られますか？</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    会話データから、AIがパートナーの性格、好きなもの、嫌いなもの、価値観などを自動で分析して作成します。会話を重ねるほど、より詳しく正確なトリセツに進化していきます。
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-lg">プライバシーは守られますか？</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    会話データはHTTPS通信で安全に送信され、クラウドデータベースに保存されます。AI分析は自動で行われ、人の目に触れることはありません。
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-lg">片方の言語だけでも使えますか？</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    はい。パートナーとのメイン言語が異なる場合のみ、自動でサブ言語にリアルタイムで翻訳されます。
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-lg">無料プランでどこまで使えますか？</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    無料プランでも、月2時間までの会話記録、AI要約、基本的なトリセツ作成機能をご利用いただけます。まずは無料でお試しいただき、必要に応じてプランをアップグレードしてください。
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-lg">喧嘩していても使えますか？</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    はい。むしろ喧嘩の時こそ、Aibondが役立ちます。感情的になりがちな話し合いも、AIが客観的に記録・要約することで、冷静な解決をサポートします。AIパートナーへの相談もおすすめです。
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-pink-500 to-rose-400"></div>
          <div className="absolute inset-0 bg-[url('/gradient-blob.png')] bg-cover bg-center opacity-20"></div>

          <div className="container mx-auto px-4 text-center relative">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl mb-6">
              今すぐ始めましょう
            </h2>
            <p className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto">
              無料プランで、まずはお試しください。<br />
              2人の絆をもっと深く、もっと円滑に。
            </p>
            <Link href="/signup">
              <Button
                size="lg"
                variant="secondary"
                className="text-lg px-10 py-7 shadow-2xl hover:scale-110 transition-all duration-300 font-semibold"
              >
                無料で始める
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
                Aibond
              </span>
              <span className="text-sm text-muted-foreground">
                © 2025 Aibond. All rights reserved.
              </span>
            </div>
            <nav className="flex gap-6">
              <Link
                href="/tokushoho"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                特定商取引法
              </Link>
              <Link
                href="/terms"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                利用規約
              </Link>
              <Link
                href="/privacy"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
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
