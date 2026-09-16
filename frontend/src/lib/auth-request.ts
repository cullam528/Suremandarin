import type { Locale } from "./i18n";

/** Shared failure handling: an HTML gateway error must not leave an auth form spinning. */
export async function sendAuthRequest(path: string, payload: unknown, locale: Locale) {
  const zh = locale === "zh";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result || typeof result !== "object") {
      const message = typeof result?.error === "string" ? result.error : "";
      const messages: Record<string, string> = {
        "Invalid identifier or password": "邮箱或密码不正确，请检查后重试。",
        "Incorrect email or password.": "邮箱或密码不正确，请检查后重试。",
        "Please complete the security verification.": "请重新完成安全验证后提交。",
        "Email or Username are already taken": "该邮箱已注册，请直接登录或找回密码。",
      };
      throw new Error(zh && messages[message] ? messages[message] : message || (zh
        ? "服务暂时不可用，请稍后重试。已填写的信息会保留。"
        : "The service is temporarily unavailable. Please try again; your entries are still here."));
    }
    return result;
  } catch (error) {
    if (controller.signal.aborted) throw new Error(zh
      ? "连接超时，请稍后重试。若正在注册，请先检查邮箱或尝试登录。"
      : "The connection timed out. If you were registering, check your email or try signing in before retrying.");
    if (error instanceof TypeError) throw new Error(zh
      ? "网络连接中断，请检查网络后重试。已填写的信息会保留。"
      : "Connection lost. Check your internet and try again; your entries are still here.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
