import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HeartCrack, MessageSquareDashed, CalendarX, MessageCircleMore, Users, Hourglass } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default async function LandingPage() {
  const t = await getTranslations("landingPage");

  const features = [
    {
      icon: SparklesIcon,
      titleKey: "feature1Title",
      descriptionKey: "feature1Description",
      image: "/feature-ai.png"
    },
    {
      icon: UsersIcon,
      titleKey: "feature2Title",
      descriptionKey: "feature2Description",
      image: "/feature-speaker.png"
    },
    {
      icon: MessageCircleMore,
      titleKey: "feature3Title",
      descriptionKey: "feature3Description",
      image: "/feature-promises.png"
    },
    {
      icon: MicIcon,
      titleKey: "feature4Title",
      descriptionKey: "feature4Description",
      image: "/feature-translation.png"
    }
  ];

  const useCases = [
    {
      icon: MessageSquareDashed,
      titleKey: "useCase1Title",
      descriptionKey: "useCase1Description",
      color: "text-rose-500",
      bg: "bg-rose-500/10"
    },
    {
      icon: CalendarX,
      titleKey: "useCase2Title",
      descriptionKey: "useCase2Description",
      color: "text-orange-500",
      bg: "bg-orange-500/10"
    },
    {
      icon: HeartCrack,
      titleKey: "useCase3Title",
      descriptionKey: "useCase3Description",
      color: "text-blue-500",
      bg: "bg-blue-500/10"
    },
    {
      icon: Hourglass,
      titleKey: "useCase4Title",
      descriptionKey: "useCase4Description",
      color: "text-purple-500",
      bg: "bg-purple-500/10"
    },
    {
      icon: MessageCircleMore,
      titleKey: "useCase5Title",
      descriptionKey: "useCase5Description",
      color: "text-green-500",
      bg: "bg-green-500/10"
    },
    {
      icon: Users,
      titleKey: "useCase6Title",
      descriptionKey: "useCase6Description",
      color: "text-amber-500",
      bg: "bg-amber-500/10"
    }
  ];

  const plans = [
    {
      nameKey: "planFree",
      price: "¥0",
      periodKey: "",
      descriptionKey: "freeReason",
      features: ["planFeature1Free", "planFeature2", "planFeature3", "planFeature4", "planFeature8", "planFeature9"],
      unavailableFeatures: ["planFeature5", "planFeature7"],
      ctaKey: "planCtaFree",
      highlighted: false,
    },
    {
      nameKey: "planLight",
      price: "¥1,280",
      periodKey: "perMonth",
      descriptionKey: "lightReason",
      features: ["planFeature1Light", "planFeature2", "planFeature3", "planFeature4", "planFeature8", "planFeature9", "planFeature5", "planFeature7"],
      ctaKey: "planCtaLight",
      highlighted: false,
    },
    {
      nameKey: "planStandard",
      price: "¥1,980",
      periodKey: "perMonth",
      descriptionKey: "standardReason",
      features: ["planFeature1Standard", "planFeature2", "planFeature3", "planFeature4", "planFeature8", "planFeature9", "planFeature5", "planFeature7"],
      ctaKey: "planCtaStandard",
      highlighted: true,
    },
    {
      nameKey: "planPremium",
      price: "¥2,980",
      periodKey: "perMonth",
      descriptionKey: "premiumReason",
      features: ["planFeature1Premium", "planFeature2", "planFeature3", "planFeature4", "planFeature8", "planFeature9", "planFeature5", "planFeature6", "planFeature7"],
      ctaKey: "planCtaPremium",
      highlighted: false,
    },
  ];

  const faqs = [
    { questionKey: "faq1Question", answerKey: "faq1Answer" },
    { questionKey: "faq2Question", answerKey: "faq2Answer" },
    { questionKey: "faq3Question", answerKey: "faq3Answer" },
    { questionKey: "faq4Question", answerKey: "faq4Answer" },
    { questionKey: "faq5Question", answerKey: "faq5Answer" },
    { questionKey: "faq6Question", answerKey: "faq6Answer" },
  ];

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
          <nav className="flex items-center gap-2 sm:gap-4 ml-auto">
            <LanguageSwitcher />
            <Link href="/login">
              <Button variant="ghost" size="sm" className="sm:size-default">{t("login")}</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="sm:size-default shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300">
                {t("heroCta")}
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

          <div className="container relative z-10 mx-auto px-4 pt-12 pb-20 md:pt-16 md:pb-32">
            <div className="grid gap-12 lg:gap-8 lg:grid-cols-2 items-center">
              <div className="flex flex-col justify-center items-center space-y-8 animate-fade-in-up text-center">
                <div className="space-y-4">
                  <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none bg-clip-text text-transparent bg-gradient-to-r from-primary via-pink-600 to-rose-500 animate-gradient">
                    {t("heroTitle1")}
                    <br />
                    {t("heroTitle2")}
                  </h1>
                  <p className="max-w-[600px] mx-auto text-muted-foreground md:text-xl leading-relaxed">
                    {t.rich("heroDescription", {
                      highlight: (chunks) => <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-pink-600 to-rose-500 font-semibold">{chunks}</span>
                    })}
                    <br />
                    <br />
                    {t.rich("heroDescription2", {
                      strong: (chunks) => <strong>{chunks}</strong>
                    })}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
                  <Link href="/signup">
                    <Button size="lg" className="text-lg px-8 py-6 shadow-lg shadow-primary/25 hover:scale-105 transition-all duration-300 w-full sm:w-auto">
                      {t("heroCta")}
                    </Button>
                  </Link>
                  <Link href="#features">
                    <Button variant="outline" size="lg" className="text-lg px-8 py-6 hover:bg-muted/50 w-full sm:w-auto">
                      {t("seeFeatures")}
                    </Button>
                  </Link>
                </div>
                <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center overflow-hidden">
                        <Image
                          src={`/avatar-${i}.jpg`}
                          alt={`User ${i}`}
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                  <p>{t("socialProof")}</p>
                </div>
              </div>
              <div className="relative mx-auto w-full max-w-[500px] aspect-[4/3] lg:aspect-square">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-pink-500/20 rounded-[2rem] transform rotate-3 scale-105 blur-2xl"></div>
                <div className="relative rounded-[2rem] overflow-hidden shadow-2xl border border-white/20 w-full h-full group">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10"></div>
                  <Image
                    src="/hero-couple-cafe.png"
                    alt="Aibond"
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    priority
                  />

                  {/* Floating UI Elements */}
                  <div className="absolute bottom-6 left-6 right-6 z-20 space-y-3">
                    <div className="bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-lg transform transition-all duration-500 hover:-translate-y-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <p className="text-xs font-medium text-muted-foreground">{t("aiAnalyzing")}</p>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {t("heroSampleText")}
                        <span className="block text-xs text-primary mt-1">{t("heroSampleResult")}</span>
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
                {t("featuresSection")}
              </h2>
              <p className="text-lg text-muted-foreground">
                {t("featuresDescription")}<br />
                {t("featuresDescription2")}
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              {features.map((feature, index) => (
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
                        alt={t(feature.titleKey as any)}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    </div>
                  )}
                  <CardHeader className="relative z-20">
                    <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-pink-500/20 group-hover:from-primary/30 group-hover:to-pink-500/30 transition-all duration-300 shadow-inner">
                      <feature.icon className="h-7 w-7 text-primary group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <CardTitle className="text-2xl">{t(feature.titleKey as any)}</CardTitle>
                  </CardHeader>
                  <CardContent className="relative z-20">
                    <CardDescription className="text-base leading-relaxed text-muted-foreground/90">
                      {t(feature.descriptionKey as any)}
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
                {t("useCasesSection")}
              </h2>
              <p className="text-lg text-muted-foreground">
                {t("useCasesDescription")}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
              {useCases.map((item, index) => (
                <Card key={index} className="group border-border/50 bg-background/60 backdrop-blur-md hover:bg-background/80 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1 h-full ${item.bg.replace('/10', '')} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                  <CardHeader>
                    <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${item.bg} ${item.color} group-hover:scale-110 transition-transform duration-300`}>
                      <item.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-lg font-bold">{t(item.titleKey as any)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t(item.descriptionKey as any)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-12 text-center">
              <p className="text-lg font-medium mb-6 flex items-center justify-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                {t("useCasesCta")}
              </p>
              <Link href="/signup">
                <Button size="lg" className="shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 transition-all duration-300 rounded-full px-8">
                  {t("heroCta")}
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
                {t("pricingSection")}
              </h2>
              <p className="text-lg text-muted-foreground">
                {t("pricingDescription")}
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto">
              {plans.map((plan, index) => (
                <Card
                  key={plan.nameKey}
                  className={`relative backdrop-blur-sm transition-all duration-300 hover:scale-105 ${plan.highlighted
                    ? "border-primary shadow-2xl shadow-primary/20 bg-gradient-to-b from-primary/5 to-background"
                    : "border-border/50 bg-background/50 hover:shadow-xl"
                    }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-gradient-to-r from-primary to-pink-500 px-5 py-1.5 text-sm font-medium text-white shadow-lg">
                        {t("recommended")}
                      </span>
                    </div>
                  )}
                  <CardHeader className="text-center pb-8">
                    <CardTitle className="text-2xl mb-4">{t(plan.nameKey as any)}</CardTitle>
                    <div className="mb-2">
                      <span className="text-5xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
                        {plan.price}
                      </span>
                      <span className="text-muted-foreground text-lg">{plan.periodKey ? t(plan.periodKey as any) : ""}</span>
                    </div>
                    <CardDescription className="text-base">
                      {t(plan.descriptionKey as any)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <ul className="space-y-3">
                      {plan.features.map((featureKey) => (
                        <li key={featureKey} className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                            <CheckIcon className="h-3 w-3 text-primary" />
                          </div>
                          <span className="text-sm">{t(featureKey as any)}</span>
                        </li>
                      ))}
                      {(plan as any).unavailableFeatures?.map((featureKey: string) => (
                        <li key={featureKey} className="flex items-center gap-3 opacity-50">
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                            <svg className="h-3 w-3 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 6 6 18" />
                              <path d="m6 6 12 12" />
                            </svg>
                          </div>
                          <span className="text-sm text-muted-foreground">{t(featureKey as any)}</span>
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
                        {t(plan.ctaKey as any)}
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
                {t("faqSection")}
              </h2>
              <p className="text-lg text-muted-foreground">
                {t("faqDescription")}
              </p>
            </div>

            <div className="max-w-3xl mx-auto space-y-4">
              {faqs.map((faq, index) => (
                <Card key={index} className="border-0 bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-lg">{t(faq.questionKey as any)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {t(faq.answerKey as any)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-pink-500 to-rose-400"></div>
          <div className="absolute inset-0 bg-[url('/gradient-blob.png')] bg-cover bg-center opacity-20"></div>

          <div className="container mx-auto px-4 text-center relative">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl mb-6">
              {t("ctaTitle")}
            </h2>
            <p className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto">
              {t("ctaDescription")}<br />
              {t("ctaDescription2")}
            </p>
            <Link href="/signup">
              <Button
                size="lg"
                variant="secondary"
                className="text-lg px-10 py-7 shadow-2xl hover:scale-110 transition-all duration-300 font-semibold"
              >
                {t("heroCta")}
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
                {t("footerTokushoho")}
              </Link>
              <Link
                href="/terms"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {t("footerTerms")}
              </Link>
              <Link
                href="/privacy"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {t("footerPrivacy")}
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
