"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold mb-8">プライバシーポリシー</h1>

        <div className="prose prose-gray max-w-none space-y-8">
          <p className="text-muted-foreground">
            最終更新日: 2025年12月1日
          </p>

          <section>
            <h2 className="text-xl font-semibold mb-4">1. はじめに</h2>
            <div className="space-y-2 text-muted-foreground">
              <p>
                Aibond（以下「本サービス」）は、お客様のプライバシーを尊重し、個人情報の保護に努めます。本ポリシーは、当社が収集する情報、その利用方法、およびお客様の権利について説明します。
              </p>
              <p>
                本サービスは18歳以上の方を対象としています。18歳未満の方からは意図的に個人情報を収集しません。
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">2. 収集する情報</h2>
            <div className="space-y-4 text-muted-foreground">
              <p><strong>2.1 アカウント情報</strong></p>
              <ul className="list-disc pl-6 space-y-1">
                <li>メールアドレス</li>
                <li>表示名・プロフィール情報</li>
                <li>認証情報（パスワードのハッシュ、OAuth連携情報）</li>
              </ul>

              <p><strong>2.2 会話データ</strong></p>
              <ul className="list-disc pl-6 space-y-1">
                <li>音声データ（録音された会話）</li>
                <li>文字起こしテキスト</li>
                <li>翻訳テキスト</li>
                <li>会話サマリー</li>
                <li>AIチャット履歴</li>
              </ul>

              <p><strong>2.3 利用データ</strong></p>
              <ul className="list-disc pl-6 space-y-1">
                <li>サービス利用状況（使用量、アクセスログ）</li>
                <li>デバイス情報、IPアドレス</li>
              </ul>

              <p><strong>2.4 決済情報</strong></p>
              <p>
                有料プランの決済処理はStripe社に委託しており、当社はクレジットカード番号等の決済情報を直接保存しません。
              </p>
            </div>
          </section>

          <section className="border-l-4 border-primary pl-4 bg-muted/30 p-4 rounded">
            <h2 className="text-xl font-semibold mb-4">3. 情報の利用目的</h2>
            <div className="space-y-2 text-muted-foreground">
              <p>収集した情報は以下の目的で利用します：</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>本サービスの提供・運営（文字起こし、翻訳、AIチャット等）</li>
                <li>サービス品質の向上と機能改善</li>
                <li>新機能の開発・研究</li>
                <li>AI/機械学習モデルの改善（匿名化されたデータを使用）</li>
                <li>統計分析（個人を特定しない形式）</li>
                <li>不正利用の防止とセキュリティ対策</li>
                <li>お問い合わせへの対応</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">4. 情報の共有・第三者提供</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                当社はお客様の個人情報を第三者へ販売・譲渡しません。ただし、サービス提供のため、以下の外部サービスにデータを送信します：
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Google Cloud Speech-to-Text</strong>: 音声の文字起こし処理</li>
                <li><strong>Google Cloud Translation</strong>: テキストの翻訳処理</li>
                <li><strong>Google Gemini</strong>: AIチャット・サマリー生成</li>
                <li><strong>Stripe</strong>: 決済処理</li>
                <li><strong>Supabase</strong>: データベース・認証・ファイルストレージ</li>
              </ul>

              <p><strong>4.1 事業譲渡</strong></p>
              <p>
                事業譲渡、会社分割、合併等により本サービスを第三者に承継させる場合、ユーザーデータ（匿名化されたものを含む）は承継先に移転されることがあります。承継先は本ポリシーと同等以上の水準でデータを取り扱うものとします。
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">5. データの保存と保持期間</h2>
            <div className="space-y-4 text-muted-foreground">
              <p><strong>5.1 アカウント有効期間中</strong></p>
              <p>すべてのユーザーデータはお客様がアクセス可能な状態で保存されます。</p>

              <p><strong>5.2 パートナー連携解除時</strong></p>
              <p>
                パートナー連携を解除した場合でも、ユーザーデータは非公開アーカイブとして当社が保持します（お客様からは閲覧不可）。
              </p>

              <p><strong>5.3 アカウント削除時</strong></p>
              <p>
                アカウント削除時は、個人を特定できる情報を削除または匿名化します。ただし、サービス改善・AI学習のため、匿名化されたデータ（音声・会話履歴等）は保持される場合があります。匿名化されたデータからは個人を特定することはできません。
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">6. お客様の権利</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>お客様は以下の権利を有します：</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>アクセス権</strong>: ご自身のデータにアクセスし、確認する権利</li>
                <li><strong>訂正権</strong>: 不正確なデータの訂正を求める権利</li>
                <li><strong>削除権</strong>: データの削除を求める権利</li>
                <li><strong>異議申立権</strong>: データ処理に異議を申し立てる権利</li>
              </ul>

              <p><strong>完全削除のリクエスト</strong></p>
              <p>
                匿名化データを含むすべてのデータの完全削除を希望する場合は、support@aibond.com までご連絡ください。法令に基づき保持義務がある場合を除き、対応いたします。
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">7. データの安全性</h2>
            <div className="space-y-2 text-muted-foreground">
              <p>当社は、お客様のデータを保護するため、以下の対策を講じています：</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>通信の暗号化（HTTPS/TLS）</li>
                <li>データベースの暗号化</li>
                <li>アクセス制御と認証</li>
                <li>定期的なセキュリティ監査</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">8. Cookieおよび類似技術</h2>
            <div className="space-y-2 text-muted-foreground">
              <p>本サービスでは、以下の目的でCookieおよび類似技術を使用します：</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>認証状態の維持（ログインセッション）</li>
                <li>サービス設定の保存</li>
                <li>サービス利用状況の分析</li>
              </ul>
              <p>
                ブラウザの設定によりCookieを無効にできますが、一部機能が制限される場合があります。
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">9. ポリシーの変更</h2>
            <p className="text-muted-foreground">
              本ポリシーを改定する場合は、本ページでの告知に加え、登録メールアドレスへの通知またはアプリ内通知により、事前にお知らせします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">10. お問い合わせ</h2>
            <p className="text-muted-foreground">
              プライバシーに関するお問い合わせ、データの開示・訂正・削除のご依頼は、support@aibond.com までご連絡ください。
            </p>
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
          <Link href="/terms">
            <Button variant="ghost">利用規約</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
