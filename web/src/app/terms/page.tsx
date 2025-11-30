"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function TermsPage() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
    };
    checkAuth();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary">Aibond</span>
          </Link>
          <nav className="flex items-center gap-4">
            {isLoggedIn === null ? null : isLoggedIn ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm">
                    ダッシュボード
                  </Button>
                </Link>
                <Link href="/settings">
                  <Button variant="ghost" size="sm">
                    設定
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    ログイン
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">無料で始める</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-bold mb-8">利用規約</h1>

        <div className="prose prose-gray max-w-none space-y-8">
          <p className="text-muted-foreground">
            最終更新日: 2025年12月1日
          </p>

          <section>
            <h2 className="text-xl font-semibold mb-4">第1条（適用）</h2>
            <p className="text-muted-foreground">
              本規約は、Aibond（以下「本サービス」）の提供条件および利用者（以下「ユーザー」）と当社との間の権利義務を定めるものです。本サービスの利用にあたり、本規約に同意したものとみなします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">第2条（アカウントおよびパートナー連携）</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>本サービスは18歳以上の方を対象としています。18歳未満の方は利用できません。</li>
              <li>ユーザーは正確な情報でアカウントを作成し、適切に管理するものとします。</li>
              <li>パートナー連携は当事者2名で行い、解消した場合でもデータは第7条に従い扱われます。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">第3条（利用料金と課金）</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>無料プランおよび有料プランの内容は別途案内します。</li>
              <li>有料プランは期間経過により自動更新されます。解約手続きがない限り課金は継続します。</li>
              <li>原則として返金は行いません。ただし、当社の責めに帰すべき重大なサービス障害により利用できなかった場合は、個別に対応いたします。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">第4条（禁止事項）</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>法令または公序良俗に反する行為</li>
              <li>第三者の権利侵害、虚偽情報の登録</li>
              <li>本サービスの運営を妨げる行為、過度なアクセス負荷</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">第5条（サービス提供）</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>本サービスは現状有姿で提供され、無停止・無欠陥を保証するものではありません。</li>
              <li>当社は予告なく機能追加・変更・停止を行う場合があります。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">第6条（知的財産権）</h2>
            <p className="text-muted-foreground">
              本サービスに関する著作権、商標等の知的財産権は当社または適法な権利者に帰属します。
            </p>
          </section>

          <section className="border-l-4 border-primary pl-4 bg-muted/30 p-4 rounded">
            <h2 className="text-xl font-semibold mb-4">第7条（ユーザーデータの取扱いと保存）</h2>
            <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
              <li>
                音声データ、文字起こし、翻訳、サマリー、チャット履歴等（以下総称して「ユーザーデータ」）は、本サービスの提供・品質改善・新機能開発・統計分析のために保存・利用します。
              </li>
              <li>
                パートナー連携を解除した場合でも、ユーザーデータは非公開アーカイブとして当社が保持します（ユーザーからは閲覧不可、内部保管のみ）。
              </li>
              <li>
                アカウント削除時は、個人を特定できる情報を削除または匿名化します。ただし、サービス改善のため、匿名化されたデータ（音声・会話履歴等）は保持される場合があります。
              </li>
              <li>
                匿名化データを含むすべてのデータの完全削除を希望する場合は、support@aibond.com までご連絡ください。法令に基づき保持義務がある場合を除き、対応いたします。
              </li>
              <li>
                当社はユーザーデータを第三者へ販売・譲渡しません。将来的に本サービスの事業譲渡・会社分割等を行う場合、事業承継先にユーザーデータを含む資産を移転することがあります。この場合、承継先も本規約または同等の水準でデータを取り扱うものとします。
              </li>
              <li>
                本サービスはユーザーデータをAI処理のために外部サービス（例: Google Gemini、Google Cloud Speech-to-Text/Translation）へ送信する場合があります。送信先はプライバシーポリシーで明示します。
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">第8条（責任範囲）</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>当社は、故意または重過失がない限り、利用に起因する損害について責任を負いません。</li>
              <li>第三者サービス（決済、AI、クラウド等）の障害に起因する損害については、当該サービスの責任範囲に従います。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">第9条（本サービスの終了・事業譲渡）</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>当社は相当の予告期間をもって本サービスを終了することができます。</li>
              <li>事業譲渡、会社分割、合併等により本サービスを第三者に承継させる場合があります。承継時は合理的な方法で通知し、承継先がユーザーデータを本規約または同等水準で扱うよう義務付けます。</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">第10条（準拠法・裁判管轄）</h2>
            <p className="text-muted-foreground">
              本規約は日本法に準拠し、紛争は東京地方裁判所を第一審の専属的合意管轄とします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">附則</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>本規約は2025年12月1日から施行します。</li>
              <li>本規約を改定する場合は、本ページでの告知に加え、登録メールアドレスへの通知またはアプリ内通知により、事前にお知らせします。</li>
            </ul>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t flex gap-4">
          {isLoggedIn ? (
            <Link href="/settings">
              <Button variant="outline">設定へ戻る</Button>
            </Link>
          ) : (
            <Link href="/signup">
              <Button>新規登録へ戻る</Button>
            </Link>
          )}
          <Link href="/privacy">
            <Button variant="ghost">プライバシーポリシー</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
