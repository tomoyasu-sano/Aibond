"use client";

import { OnboardingTooltip } from "./OnboardingTooltip";

export function TalksOnboarding() {
  return (
    <>
      <OnboardingTooltip
        id="talks-start-recording"
        targetSelector="[data-onboarding='start-recording']"
        title="会話を録音しよう！"
        description="このボタンで新しい会話を始められます。録音中はリアルタイムで文字起こしされ、パートナーの言語に翻訳されます。"
        position="bottom"
      />
    </>
  );
}
