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
    referrals: (stats?.referrals ?? []).map((r) => ({
      id: r._id,
      status: r.status,
      createdAt: r.createdAt,
      qualifiedAt: r.qualifiedAt,
      invitee: r.invitee,
    })),
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
