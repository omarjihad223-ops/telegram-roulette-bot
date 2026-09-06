export interface MeResponse {
  ok: true;
  user: {
    telegramId: number;
    username?: string;
    firstName?: string;
    photoUrl?: string;
    captchaPassed: boolean;
    forcedSubOk: boolean;
    totalSpins: number;
  };
  wheel: { ready: boolean; nextSpinAt: string };
  isAdmin: boolean;
  adminRole: 'owner' | 'developer' | null;
}

export interface ForcedSubMissing {
  chatId: string;
  title: string;
  isSubscribed: boolean;
  inviteLink?: string;
}

export interface SpinResult {
  won: boolean;
  prizeName?: string;
  prizeKey?: string;
  userPrizeId?: string;
  expiresAt?: string | null;
  nextSpinAt: string;
}

export interface InventoryItem {
  id: string;
  prizeName: string;
  source: 'wheel' | 'referral';
  wonAt: string;
  expiresAt: string | null;
  status: 'active' | 'claim_requested' | 'approved' | 'rejected' | 'expired';
  task: {
    link: string | null;
    requiredCount: number;
    creditedCount: number;
    status: 'pending' | 'completed' | 'expired';
  } | null;
}

export interface DeveloperItem {
  telegramId: number;
  username?: string;
  role: 'owner' | 'developer';
  createdAt: string;
}

export interface ReferralData {
  link: string | null;
  pending: number;
  qualified: number;
  total: number;
  referrals: Array<{ id: string; status: string; createdAt: string; qualifiedAt?: string; invitee: unknown }>;
  rules: string[];
}

export interface NotificationItem {
  _id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}
