import { Router } from 'express';
import { identifyUserEndpoint, getCurrentUser } from '../controllers/auth.controller.js';
import { requestMagicLink, verifyMagicLink, logout } from '../controllers/magiclink.controller.js';
import { loginWithMicrosoft } from '../controllers/microsoft.controller.js';
import { loginWithPassword } from '../controllers/password.controller.js';
import { identifyUser } from '../middlewares/auth.middleware.js';

const router = Router();

// Public routes (no auth required)
router.post('/auth/magic-link', requestMagicLink);
router.post('/auth/verify', verifyMagicLink);
router.post('/auth/microsoft', loginWithMicrosoft);
router.post('/auth/login', loginWithPassword);

// Authenticated routes
router.post('/auth/logout', identifyUser, logout);
router.get('/auth/me', identifyUser, getCurrentUser);

// Dev route (identify by email)
router.post('/auth/identify', identifyUserEndpoint);

export default router;
