"use client";

import { OnboardingTooltip } from "./OnboardingTooltip";

export function KizunaOnboarding() {
  return (
    <>
      <OnboardingTooltip
        id="kizuna-create-topic"
        targetSelector="[data-onboarding='create-topic']"
        title="絆ノートを始めよう！"
        description="ふたりで決めた約束やルールを記録できます。「家事分担」「記念日」など、テーマごとに整理して管理しましょう。"
        position="bottom"
      />
    </>
  );
}
