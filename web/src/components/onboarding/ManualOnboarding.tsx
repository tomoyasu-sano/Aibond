"use client";

import { OnboardingTooltip } from "./OnboardingTooltip";

export function ManualOnboarding() {
  return (
    <>
      <OnboardingTooltip
        id="manual-book-cover"
        targetSelector="[data-onboarding='my-book']"
        title="取説を作ろう！"
        description="本をタップすると、自分やパートナーの取扱説明書を作成・閲覧できます。性格、好み、大切にしていることなどを記録しましょう。"
        position="right"
      />
    </>
  );
}
