"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ONBOARDING_QUESTIONS } from "@/lib/manual/config";
import type { ManualItem } from "@/types/manual";
import { motion, AnimatePresence } from "framer-motion";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUserId: string;
  currentUserId: string;
  partnershipId?: string;
  onComplete: (items: ManualItem[]) => void;
}

export function OnboardingModal({
  isOpen,
  onClose,
  targetUserId,
  currentUserId,
  partnershipId,
  onComplete,
}: OnboardingModalProps) {
  const t = useTranslations("manual");
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>(Array(5).fill(""));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQuestion = ONBOARDING_QUESTIONS[currentStep];

  const handleNext = async () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      await handleComplete();
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);

    try {
      // 5つの質問と回答を一括で保存
      const createdItems: ManualItem[] = [];

      for (let i = 0; i < ONBOARDING_QUESTIONS.length; i++) {
        const question = ONBOARDING_QUESTIONS[i];
        const answer = answers[i];

        if (!answer.trim()) continue;

        const res = await fetch("/api/manual", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target_user_id: targetUserId,
            category: question.category,
            question: question.question,
            answer: answer.trim(),
            partnership_id: partnershipId,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          createdItems.push(data.item);
        }
      }

      onComplete(createdItems);
      handleReset();
    } catch (error) {
      console.error("Error creating onboarding items:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setAnswers(Array(5).fill(""));
    onClose();
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleReset}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">📖 取説を作りましょう</DialogTitle>
          <DialogDescription>
            まずは簡単な質問に答えて、取説の「紙」を作ってみましょう
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* プログレスバー */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>質問 {currentStep + 1} / 5</span>
              <span>{Math.round(((currentStep + 1) / 5) * 100)}%</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: "0%" }}
                animate={{ width: `${((currentStep + 1) / 5) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* 質問と回答フォーム */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              <Label htmlFor="answer" className="text-base font-semibold">
                {currentQuestion.question}
              </Label>
              <Input
                id="answer"
                value={answers[currentStep]}
                onChange={(e) => {
                  const newAnswers = [...answers];
                  newAnswers[currentStep] = e.target.value;
                  setAnswers(newAnswers);
                }}
                placeholder={currentQuestion.placeholder}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && answers[currentStep].trim()) {
                    handleNext();
                  }
                }}
                autoFocus
              />
            </motion.div>
          </AnimatePresence>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset} disabled={isSubmitting}>
              キャンセル
            </Button>
            {currentStep > 0 && (
              <Button variant="ghost" onClick={handlePrevious} disabled={isSubmitting}>
                ← 戻る
              </Button>
            )}
          </div>
          <Button
            onClick={handleNext}
            disabled={!answers[currentStep].trim() || isSubmitting}
          >
            {isSubmitting ? "保存中..." : currentStep < 4 ? "次へ →" : "完了 ✓"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
