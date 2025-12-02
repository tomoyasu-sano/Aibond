"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Step = "input" | "success";

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>("input");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const t = useTranslations("feedback");

  // 少し遅れて表示（ページ読み込み後）
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const reset = () => {
    setStep("input");
    setMessage("");
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(reset, 300);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!res.ok) throw new Error("Failed to send feedback");

      setStep("success");
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      console.error("Error sending feedback:", error);
      toast.error(t("sendFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {/* フローティングボタン */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all text-sm font-medium"
            aria-label={t("buttonLabel")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="hidden sm:inline">{t("buttonText")}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* フィードバックダイアログ */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* バックドロップ */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
            />

            {/* ダイアログ */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="fixed bottom-6 right-6 z-50 w-[360px] bg-background rounded-2xl shadow-2xl overflow-hidden border"
            >
              {/* ヘッダー */}
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <div>
                  <h3 className="font-semibold">{t("title")}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("subtitle")}
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-full hover:bg-muted transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-muted-foreground"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>

              {/* コンテンツ */}
              <div className="p-5">
                <AnimatePresence mode="wait">
                  {/* 入力フォーム */}
                  {step === "input" && (
                    <motion.div
                      key="input"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      <Textarea
                        placeholder={t("placeholder")}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="min-h-[120px] resize-none text-sm"
                        autoFocus
                      />

                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {t("hint")}
                        </p>
                        <Button
                          size="sm"
                          onClick={handleSubmit}
                          disabled={isSubmitting || !message.trim()}
                        >
                          {isSubmitting ? t("sending") : t("send")}
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* 完了 */}
                  {step === "success" && (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="py-6 text-center"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", delay: 0.1 }}
                        className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-green-600 dark:text-green-400"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </motion.div>
                      <p className="font-medium">{t("thankYou")}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t("thankYouMessage")}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
