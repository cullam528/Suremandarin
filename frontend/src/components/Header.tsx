"use client";

import { LogOut, Menu, UserCircle, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { GlobalData } from "@/lib/strapi";
import type { Locale } from "@/lib/i18n";
import { ui } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function Header({
  locale = "en",
}: {
  settings: GlobalData;
  locale?: Locale;
}) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<{
    fullName?: string;
    username?: string;
  } | null>(null);
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const labels = ui[locale];
  const localizedNavigation = [
    [labels.home, `/${locale}#home`],
    [labels.courses, `/${locale}/courses`],
    [labels.daily, `/${locale}/daily`],
    [labels.levelTest, `/${locale}/level-test`],
    [labels.knowledge, `/${locale}/knowledge`],
    [labels.say, `/${locale}/theysay`],
    [labels.about, `/${locale}/about`],
  ];
  const currentPath = pathname.replace(/\/$/, "") || "/";
  const isActive = (href: string) => {
    const targetPath = href.split("#")[0].replace(/\/$/, "") || "/";
    if (targetPath === `/${locale}`) {
      return currentPath === targetPath || (locale === "en" && currentPath === "/");
    }
    return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
  };
  useEffect(() => {
    fetch("/api/auth/session", {
      cache: "no-store",
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => setUser(data.user))
      .catch(() => setUser(null));
  }, []);
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push(`/${locale}`);
    router.refresh();
  }
  return (
    <header className="sm-site-header sticky top-0 z-50 bg-white/95 backdrop-blur">
      <div className="sm-site-header-inner page-shell flex h-20 items-center gap-8">
        <a
          href={`/${locale}#home`}
          className="flex shrink-0 items-center gap-3"
          aria-label="SureMandarin home"
        >
          <Image
            src="/images/suremandarin-logo.webp?v=20260811"
            alt="SureMandarin logo"
            width={325}
            height={70}
            priority
            className="sm-site-logo h-auto w-[min(325px,62vw)] object-contain"
          />
        </a>
        <nav
          className="ml-auto hidden items-center gap-7 lg:flex"
          aria-label="Primary navigation"
        >
          {localizedNavigation.map(([label, href]) => {
            const active = isActive(href);
            return (
              <a
                key={label}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`py-7 text-sm font-semibold hover:text-brand-blue ${active ? "border-b-2 border-brand-blue text-brand-blue" : "text-brand-navy"}`}
              >
                {label}
              </a>
            );
          })}
        </nav>
        <div className="hidden items-center gap-4 lg:flex">
          {user ? (
            <>
              <a
                href={`/${locale}/account`}
                className="flex items-center gap-2 text-sm font-semibold text-brand-navy"
              >
                <UserCircle size={18} />
                {user.fullName || user.username || "My Account"}
              </a>
              <button
                onClick={logout}
                type="button"
                aria-label={labels.logout}
                className="text-slate-500"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <>
              <a
                href={`/${locale}/login`}
                className="text-sm font-semibold text-brand-navy"
              >
                {labels.login}
              </a>
              <a
                href={`/${locale}/register`}
                className="brand-gradient rounded-lg px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-200"
              >
                {labels.signup}
              </a>
            </>
          )}
          <LanguageSwitcher locale={locale} />
        </div>
        <button
          type="button"
          className="sm-menu-trigger ml-auto rounded-xl p-2 text-brand-navy lg:hidden"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label="Toggle menu"
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <nav
          className="sm-mobile-menu border-t border-brand-line bg-white px-6 py-4 lg:hidden"
          aria-label="Mobile navigation"
        >
          {localizedNavigation.map(([label, href]) => {
            const active = isActive(href);
            return (
              <a
                key={label}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`block border-b py-3 font-semibold ${active ? "border-brand-blue text-brand-blue" : "border-brand-line text-brand-navy"}`}
              >
                {label}
              </a>
            );
          })}
          <a
            href={user ? `/${locale}/account` : `/${locale}/login`}
            className="block py-3 font-semibold text-brand-blue"
          >
            {user ? labels.account : `${labels.login} / ${labels.signup}`}
          </a>
        </nav>
      )}
    </header>
  );
}
