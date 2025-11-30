"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { LANGUAGES, type LanguageCode } from "@/types/database";

interface PartnerData {
  partnership: {
    id: string;
    partnership_name: string | null;
    created_at: string;
  } | null;
  partner: {
    id: string;
    display_name: string | null;
    language: LanguageCode;
  } | null;
}

interface Invitation {
  id: string;
  invite_code: string;
  expires_at: string;
}

export default function PartnersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PartnerData | null>(null);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [partnerRes, inviteRes] = await Promise.all([
        fetch("/api/partners"),
        fetch("/api/partners/invite"),
      ]);

      if (partnerRes.status === 401) {
        router.push("/login");
        return;
      }

      const partnerData = await partnerRes.json();
      const inviteData = await inviteRes.json();

      setData(partnerData);
      setInvitation(inviteData.invitation);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const createInvitation = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/partners/invite", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      setInvitation(data.invitation);
      toast.success("招待コードを作成しました");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "招待コードの作成に失敗しました");
    } finally {
      setCreating(false);
    }
  };

  const cancelInvitation = async () => {
    try {
      await fetch("/api/partners/invite", { method: "DELETE" });
      setInvitation(null);
      toast.success("招待コードをキャンセルしました");
    } catch (error) {
      toast.error("招待コードのキャンセルに失敗しました");
    }
  };

  const joinPartner = async () => {
    if (!inviteCode.trim()) {
      toast.error("招待コードを入力してください");
      return;
    }

    setJoining(true);
    try {
      const res = await fetch("/api/partners/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: inviteCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      toast.success("パートナーと連携しました！");
      setInviteCode("");
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "連携に失敗しました");
    } finally {
      setJoining(false);
    }
  };

  const unlinkPartner = async () => {
    setUnlinking(true);
    try {
      const res = await fetch("/api/partners", { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      toast.success("パートナー連携を解除しました");
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "連携解除に失敗しました");
    } finally {
      setUnlinking(false);
    }
  };

  const deleteHistory = async () => {
    try {
      const res = await fetch("/api/partners/history", { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      toast.success(`履歴を削除しました（会話: ${data.deleted.talks}件、約束: ${data.deleted.promises}件）`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "履歴の削除に失敗しました");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("コピーしました");
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header onSignOut={handleSignOut} />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </main>
      </div>
    );
  }

  const hasPartner = data?.partnership && data?.partner;

  return (
    <div className="min-h-screen bg-background">
      <Header onSignOut={handleSignOut} />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">パートナー連携</h1>
          <p className="mt-2 text-muted-foreground">
            パートナーと連携して、会話記録を共有しましょう
          </p>
        </div>

        {hasPartner ? (
          // Connected state
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>連携中のパートナー</CardTitle>
                <CardDescription>
                  パートナーとの連携状況
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">パートナー名</span>
                  <span className="font-medium">
                    {data.partner?.display_name || "名前未設定"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">使用言語</span>
                  <span>
                    {LANGUAGES.find(l => l.code === data.partner?.language)?.nativeName || data.partner?.language}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">連携日</span>
                  <span>
                    {new Date(data.partnership!.created_at).toLocaleDateString("ja-JP")}
                  </span>
                </div>

                <Separator />

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full" disabled={unlinking}>
                      {unlinking ? "解除中..." : "連携を解除"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>パートナー連携を解除しますか？</AlertDialogTitle>
                      <AlertDialogDescription>
                        連携を解除すると、新しい会話の記録ができなくなります。
                        過去の会話履歴は保持されますが、後から削除することもできます。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>キャンセル</AlertDialogCancel>
                      <AlertDialogAction onClick={unlinkPartner}>
                        解除する
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>履歴管理</CardTitle>
                <CardDescription>
                  会話履歴の管理
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  連携解除後、過去の会話履歴を削除できます。
                  削除した履歴は復元できません。
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      過去の履歴を削除
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>履歴を削除しますか？</AlertDialogTitle>
                      <AlertDialogDescription>
                        解除済みパートナーとの会話履歴と約束を完全に削除します。
                        この操作は取り消せません。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>キャンセル</AlertDialogCancel>
                      <AlertDialogAction onClick={deleteHistory}>
                        削除する
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Not connected state
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>パートナーを招待</CardTitle>
                <CardDescription>
                  招待コードを作成してパートナーに共有してください
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {invitation ? (
                  <>
                    <div className="space-y-2">
                      <Label>招待コード</Label>
                      <div className="flex gap-2">
                        <Input
                          value={invitation.invite_code}
                          readOnly
                          className="font-mono text-lg tracking-wider"
                        />
                        <Button
                          variant="outline"
                          onClick={() => copyToClipboard(invitation.invite_code)}
                        >
                          コピー
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        有効期限: {new Date(invitation.expires_at).toLocaleString("ja-JP")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={cancelInvitation}
                      className="w-full"
                    >
                      招待をキャンセル
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={createInvitation}
                    disabled={creating}
                    className="w-full"
                  >
                    {creating ? "作成中..." : "招待コードを作成"}
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>招待コードで参加</CardTitle>
                <CardDescription>
                  パートナーから受け取った招待コードを入力してください
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">招待コード</Label>
                  <Input
                    id="inviteCode"
                    placeholder="XXXX-XXXX-XXXX"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    className="font-mono text-lg tracking-wider"
                  />
                </div>
                <Button
                  onClick={joinPartner}
                  disabled={joining || !inviteCode.trim()}
                  className="w-full"
                >
                  {joining ? "参加中..." : "参加する"}
                </Button>
              </CardContent>
            </Card>

            {/* History deletion for unlinked partnerships */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>過去の履歴管理</CardTitle>
                <CardDescription>
                  解除済みパートナーとの会話履歴を削除できます
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline">
                      過去の履歴を削除
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>履歴を削除しますか？</AlertDialogTitle>
                      <AlertDialogDescription>
                        解除済みパートナーとの会話履歴と約束を完全に削除します。
                        この操作は取り消せません。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>キャンセル</AlertDialogCancel>
                      <AlertDialogAction onClick={deleteHistory}>
                        削除する
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

function Header({ onSignOut }: { onSignOut: () => void }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl font-bold text-primary">Aibond</span>
        </Link>
        <nav className="flex items-center gap-4">
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
        </nav>
      </div>
    </header>
  );
}
