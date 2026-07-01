import { Router } from 'express';
import { sendTestEmail, sendTestMagicLink } from '../controllers/email.controller.js';

const router = Router();

router.post('/email/send-test', sendTestEmail);
router.post('/email/send-magic-link-test', sendTestMagicLink);

export default router;
