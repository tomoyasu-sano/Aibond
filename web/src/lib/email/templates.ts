/**
 * Email Templates
 *
 * 各種メールテンプレート
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://aibond.app";

// 共通のベーススタイル
const baseStyle = `
  font-family: 'Helvetica Neue', Arial, sans-serif;
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  background-color: #ffffff;
`;

const headerStyle = `
  text-align: center;
  padding: 20px 0;
  border-bottom: 2px solid #FF7F7F;
`;

const buttonStyle = `
  display: inline-block;
  background-color: #FF7F7F;
  color: white;
  padding: 12px 24px;
  text-decoration: none;
  border-radius: 8px;
  font-weight: bold;
  margin: 20px 0;
`;

const footerStyle = `
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
  text-align: center;
  color: #666666;
  font-size: 12px;
`;

/**
 * 支払い失敗時のメールテンプレート
 */
export function paymentFailedEmail(userName: string | null): { subject: string; html: string; text: string } {
  const name = userName || "お客様";

  const subject = "【Aibond】お支払いに失敗しました";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="${baseStyle}">
  <div style="${headerStyle}">
    <h1 style="color: #FF7F7F; margin: 0;">Aibond</h1>
  </div>

  <div style="padding: 30px 0;">
    <h2 style="color: #333333;">${name}さん</h2>

    <p style="color: #333333; line-height: 1.8;">
      いつもAibondをご利用いただきありがとうございます。
    </p>

    <p style="color: #333333; line-height: 1.8;">
      <strong style="color: #FFA500;">ご登録のお支払い方法で決済が完了できませんでした。</strong>
    </p>

    <p style="color: #333333; line-height: 1.8;">
      プランがFreeプランに変更されました。引き続き有料プランをご利用いただくには、
      お支払い方法を更新してください。
    </p>

    <div style="text-align: center;">
      <a href="${BASE_URL}/settings" style="${buttonStyle}">
        お支払い方法を更新
      </a>
    </div>

    <p style="color: #666666; font-size: 14px; line-height: 1.8;">
      ご不明な点がございましたら、お気軽にお問い合わせください。
    </p>
  </div>

  <div style="${footerStyle}">
    <p>Aibond - 言葉の壁を越えて、大切な人との絆を深める</p>
    <p><a href="${BASE_URL}" style="color: #FF7F7F;">aibond.app</a></p>
  </div>
</body>
</html>
`;

  const text = `
${name}さん

いつもAibondをご利用いただきありがとうございます。

ご登録のお支払い方法で決済が完了できませんでした。

プランがFreeプランに変更されました。引き続き有料プランをご利用いただくには、
お支払い方法を更新してください。

お支払い方法の更新: ${BASE_URL}/settings

ご不明な点がございましたら、お気軽にお問い合わせください。

---
Aibond - 言葉の壁を越えて、大切な人との絆を深める
${BASE_URL}
`;

  return { subject, html, text };
}

/**
 * 使用量警告メール（80%到達時）
 */
export function usageWarning80Email(
  userName: string | null,
  minutesUsed: number,
  minutesLimit: number,
  plan: string
): { subject: string; html: string; text: string } {
  const name = userName || "お客様";
  const remaining = minutesLimit - minutesUsed;

  const subject = "【Aibond】今月の利用時間が80%に達しました";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="${baseStyle}">
  <div style="${headerStyle}">
    <h1 style="color: #FF7F7F; margin: 0;">Aibond</h1>
  </div>

  <div style="padding: 30px 0;">
    <h2 style="color: #333333;">${name}さん</h2>

    <p style="color: #333333; line-height: 1.8;">
      いつもAibondをご利用いただきありがとうございます。
    </p>

    <p style="color: #333333; line-height: 1.8;">
      今月の利用時間が<strong style="color: #FFA500;">80%</strong>に達しました。
    </p>

    <div style="background-color: #FFF8DC; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; color: #333333;">
        <strong>現在のプラン:</strong> ${plan}<br>
        <strong>利用状況:</strong> ${minutesUsed}分 / ${minutesLimit}分<br>
        <strong>残り:</strong> ${remaining}分
      </p>
    </div>

    <p style="color: #333333; line-height: 1.8;">
      上限に達すると新しいトークを開始できなくなります。
      より長くご利用いただくには、プランのアップグレードをご検討ください。
    </p>

    <div style="text-align: center;">
      <a href="${BASE_URL}/plans" style="${buttonStyle}">
        プランを確認する
      </a>
    </div>
  </div>

  <div style="${footerStyle}">
    <p>Aibond - 言葉の壁を越えて、大切な人との絆を深める</p>
    <p><a href="${BASE_URL}" style="color: #FF7F7F;">aibond.app</a></p>
  </div>
</body>
</html>
`;

  const text = `
${name}さん

いつもAibondをご利用いただきありがとうございます。

今月の利用時間が80%に達しました。

現在のプラン: ${plan}
利用状況: ${minutesUsed}分 / ${minutesLimit}分
残り: ${remaining}分

上限に達すると新しいトークを開始できなくなります。
より長くご利用いただくには、プランのアップグレードをご検討ください。

プランを確認する: ${BASE_URL}/plans

---
Aibond - 言葉の壁を越えて、大切な人との絆を深める
${BASE_URL}
`;

  return { subject, html, text };
}

/**
 * 使用量上限到達メール（100%到達時）
 */
export function usageLimitReachedEmail(
  userName: string | null,
  minutesLimit: number,
  plan: string
): { subject: string; html: string; text: string } {
  const name = userName || "お客様";

  const subject = "【Aibond】今月の利用時間の上限に達しました";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="${baseStyle}">
  <div style="${headerStyle}">
    <h1 style="color: #FF7F7F; margin: 0;">Aibond</h1>
  </div>

  <div style="padding: 30px 0;">
    <h2 style="color: #333333;">${name}さん</h2>

    <p style="color: #333333; line-height: 1.8;">
      いつもAibondをご利用いただきありがとうございます。
    </p>

    <p style="color: #333333; line-height: 1.8;">
      今月の利用時間が<strong style="color: #FF6B6B;">上限（${minutesLimit}分）</strong>に達しました。
    </p>

    <div style="background-color: #FFEBEE; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FF6B6B;">
      <p style="margin: 0; color: #333333;">
        <strong>現在のプラン:</strong> ${plan}<br>
        <strong>今月の利用上限:</strong> ${minutesLimit}分<br>
        <strong>ステータス:</strong> 上限に達しました
      </p>
    </div>

    <p style="color: #333333; line-height: 1.8;">
      来月1日に利用時間がリセットされます。
      今すぐ利用を再開したい場合は、プランのアップグレードをご検討ください。
    </p>

    <div style="text-align: center;">
      <a href="${BASE_URL}/plans" style="${buttonStyle}">
        プランをアップグレード
      </a>
    </div>
  </div>

  <div style="${footerStyle}">
    <p>Aibond - 言葉の壁を越えて、大切な人との絆を深める</p>
    <p><a href="${BASE_URL}" style="color: #FF7F7F;">aibond.app</a></p>
  </div>
</body>
</html>
`;

  const text = `
${name}さん

いつもAibondをご利用いただきありがとうございます。

今月の利用時間が上限（${minutesLimit}分）に達しました。

現在のプラン: ${plan}
今月の利用上限: ${minutesLimit}分
ステータス: 上限に達しました

来月1日に利用時間がリセットされます。
今すぐ利用を再開したい場合は、プランのアップグレードをご検討ください。

プランをアップグレード: ${BASE_URL}/plans

---
Aibond - 言葉の壁を越えて、大切な人との絆を深める
${BASE_URL}
`;

  return { subject, html, text };
}
