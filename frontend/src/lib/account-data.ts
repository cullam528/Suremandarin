import { getAuthToken, STRAPI_URL } from "@/lib/auth";

export type AccountOverview = {
  subscriptions: Array<{
    subscriptionNumber: string;
    status: string;
    channel: string;
    autoRenew: boolean;
    currentPeriodEnd?: string;
    plan?: { name?: string; code?: string } | null;
  }>;
  orders: Array<{
    orderNumber: string;
    productType: string;
    productName: string;
    paidAmount?: number;
    currency: string;
    orderStatus: string;
    paymentStatus: string;
    paidAt?: string;
    createdAt?: string;
    lessonHours?: number;
  }>;
  enrollments: Array<{
    status: string;
    source: string;
    enrolledAt?: string;
    expiresAt?: string;
    course?: { title?: string; slug?: string; summary?: string } | null;
  }>;
  progress: Array<{
    progressPercent: number;
    completed: boolean;
    lastStudiedAt?: string;
    course?: { title?: string; slug?: string } | null;
    module?: { title?: string } | null;
    lesson?: { title?: string } | null;
  }>;
  lessonCredits: {
    availableHours: number;
    reservedHours?: number;
    bySource?: Record<string, number>;
    credits: Array<{
      hours: number;
      source: string;
      status: string;
      grantedAt?: string;
    }>;
  };
  lessonBookings: Array<{
    id: number;
    status: "requested" | "confirmed" | "completed" | "cancelled" | string;
    requestedStartAt: string;
    requestedEndAt?: string;
    timezone: string;
    teacherUserId?: number | null;
    teacherName?: string | null;
    notes?: string;
    confirmedAt?: string;
    completedAt?: string;
    cancelledAt?: string;
    course?: { title?: string; slug?: string; summary?: string } | null;
  }>;
  referralStats: {
    invitedCount: number;
    registeredCount: number;
    enrolledCount: number;
    pendingRewardHours: number;
    earnedRewardHours: number;
  };
  referrals: Array<{
    sourceChannel: string;
    referrerName?: string;
    referredName?: string;
    referredEmail?: string;
    courseName?: string;
    orderNumber?: string;
    rewardStatus: string;
    rewardHours: number;
  }>;
};

export async function getAccountOverview(): Promise<AccountOverview | null> {
  const token = await getAuthToken();
  if (!token) return null;
  const response = await fetch(`${STRAPI_URL}/api/v1/account/overview`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return response.json() as Promise<AccountOverview>;
}
