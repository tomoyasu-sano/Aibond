"use client";

import { OnboardingTooltip } from "./OnboardingTooltip";

export function DashboardOnboarding() {
  return (
    <>
      {/* Step 1: 会話を始めるカードを案内 */}
      <OnboardingTooltip
        id="dashboard-start-conversation"
        targetSelector="[data-onboarding='start-conversation']"
        title="まずは会話を録音しよう！"
        description="ここから会話を録音できます。リアルタイムで文字起こし＆翻訳されます。"
        position="bottom"
      />
    </>
  );
}
