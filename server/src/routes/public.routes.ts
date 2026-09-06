import { Router } from 'express';
import { miniAppAuth } from '../middleware/miniAppAuth';
import { spinLimiter, claimLimiter } from '../middleware/rateLimit';
import { getMe, getForcedSubStatus } from '../controllers/user.controller';
import { requestCaptcha, submitCaptcha } from '../controllers/captcha.controller';
import { getWheelStatus, spin } from '../controllers/roulette.controller';
import { listMyInventory, claimPrize } from '../controllers/inventory.controller';
import { getMyReferrals } from '../controllers/referral.controller';
import { listMyNotifications, markRead } from '../controllers/notification.controller';

const router = Router();

router.use(miniAppAuth);

router.get('/me', getMe);
router.get('/forced-sub/status', getForcedSubStatus);

router.post('/captcha/request', requestCaptcha);
router.post('/captcha/submit', submitCaptcha);

router.get('/wheel/status', getWheelStatus);
router.post('/wheel/spin', spinLimiter, spin);

router.get('/inventory', listMyInventory);
router.post('/inventory/claim', claimLimiter, claimPrize);

router.get('/referrals', getMyReferrals);

router.get('/notifications', listMyNotifications);
router.post('/notifications/read', markRead);

export default router;
