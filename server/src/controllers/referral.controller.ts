import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { getReferralStats } from '../services/referral.service';

export const getMyReferrals = asyncHandler(async (req: Request, res: Response) => {
  const stats = await getReferralStats(req.telegramId!);

  res.json({
    ok: true,
    link: null, // links are now per-prize — see each active prize in the inventory
    pending: stats?.pending ?? 0,
    qualified: stats?.qualified ?? 0,
    total: stats?.total ?? 0,
    referrals: (stats?.referrals ?? []).map((r) => {
      const invitee = r.invitee as unknown as {
        telegramId?: number;
        username?: string;
        firstName?: string;
        photoUrl?: string;
      } | null;
      return {
        id: r._id,
        status: r.status,
        createdAt: r.createdAt,
        qualifiedAt: r.qualifiedAt,
        invitee: invitee
          ? {
              name: invitee.username ? '@' + invitee.username : invitee.firstName || 'مستخدم',
              photoUrl: invitee.photoUrl ?? null,
              // Opens their Telegram profile directly — by @username when they have one
              // (most reliable), otherwise by numeric ID via Telegram's tg://user scheme.
              profileLink: invitee.username ? `https://t.me/${invitee.username}` : `tg://user?id=${invitee.telegramId}`,
            }
          : null,
      };
    }),
    rules: [
      'كل جائزة تربحها من العجلة لها رابط دعوة خاص فيها بس، تلقاه في حقيبتك.',
      'ممنوع دعوة أشخاص من غير محتوى Bounty.',
      'ممنوع استخدام أرقام أو حسابات وهمية.',
      'أي إحالة مخالفة قد يتم إلغاؤها.',
      'يجب على الشخص المدعو إكمال الاشتراك الإجباري والكابتشا حتى تُحتسب.',
      'كل شخص مدعو يُحتسب لجائزة واحدة فقط طوال الوقت.',
    ],
  });
});
