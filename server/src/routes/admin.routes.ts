import { Router } from 'express';
import { miniAppAuth } from '../middleware/miniAppAuth';
import { requireAdmin, requireOwner } from '../middleware/requireAdmin';
import {
  adminListPrizes,
  adminCreatePrize,
  adminUpdatePrize,
  adminDeletePrize,
  adminAddStock,
  adminRemoveStock,
  adminSetStock,
  adminSetPrizeActive,
} from '../controllers/adminPrize.controller';
import {
  adminListWithdrawals,
  adminViewReferralsForWithdrawal,
  adminApproveWithdrawal,
  adminRejectWithdrawal,
} from '../controllers/adminWithdrawal.controller';
import { adminBanUser, adminUnbanUser, adminListBanned, adminUnbanAll } from '../controllers/adminBan.controller';
import {
  adminListForcedChats,
  adminAddForcedChat,
  adminRemoveForcedChat,
  adminClearForcedChats,
} from '../controllers/adminForcedChat.controller';
import {
  adminListDevelopers,
  adminAddDeveloper,
  adminRemoveDeveloper,
  adminRemoveAllDevelopers,
} from '../controllers/adminDeveloper.controller';
import {
  adminGetStats,
  adminListAuditLogs,
  adminGetSettings,
  adminUpdateSettings,
  adminToggleMaintenance,
  adminRunBroadcast,
} from '../controllers/adminSystem.controller';

const router = Router();

router.use(miniAppAuth, requireAdmin);

// Prizes / inventory
router.get('/prizes', adminListPrizes);
router.post('/prizes', adminCreatePrize);
router.patch('/prizes/:key', adminUpdatePrize);
router.delete('/prizes/:key', adminDeletePrize);
router.post('/prizes/:key/stock/add', adminAddStock);
router.post('/prizes/:key/stock/remove', adminRemoveStock);
router.post('/prizes/:key/stock/set', adminSetStock);
router.post('/prizes/:key/active', adminSetPrizeActive);

// Withdrawals
router.get('/withdrawals', adminListWithdrawals);
router.get('/withdrawals/:id/referrals', adminViewReferralsForWithdrawal);
router.post('/withdrawals/:id/approve', adminApproveWithdrawal);
router.post('/withdrawals/:id/reject', adminRejectWithdrawal);

// Bans
router.get('/bans', adminListBanned);
router.post('/bans', adminBanUser);
router.post('/bans/unban', adminUnbanUser);
router.post('/bans/unban-all', adminUnbanAll);

// Forced subscription
router.get('/forced-chats', adminListForcedChats);
router.post('/forced-chats', adminAddForcedChat);
router.delete('/forced-chats/:chatId', adminRemoveForcedChat);
router.post('/forced-chats/clear', adminClearForcedChats);

// Developers (owner-only mutations; any admin can list)
router.get('/developers', adminListDevelopers);
router.post('/developers', requireOwner, adminAddDeveloper);
router.delete('/developers/:telegramId', requireOwner, adminRemoveDeveloper);
router.post('/developers/clear', requireOwner, adminRemoveAllDevelopers);

// Stats / audit / settings / broadcast
router.get('/stats', adminGetStats);
router.get('/audit-logs', adminListAuditLogs);
router.get('/settings', adminGetSettings);
router.patch('/settings', adminUpdateSettings);
router.post('/settings/maintenance', adminToggleMaintenance);
router.post('/broadcast', adminRunBroadcast);

export default router;
