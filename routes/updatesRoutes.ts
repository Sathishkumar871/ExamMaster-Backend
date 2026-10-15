import { Router } from 'express';
import {
  getUpdatesController,
  getPublicUpdatesController,
  getUpdateByIdController,
  createUpdateController,
  updateUpdateController,
  publishUpdateController,
  deleteUpdateController,
} from '../controllers/updatesController'; // Mee controller file path ikkada ivvandi

// Mee auth middleware import cheyandi (Oka vela unte)
// import verifyToken from '../middleware/authMiddleware'; 

const router = Router();

/* =========================================================
   PUBLIC / CITIZEN ROUTES (Authentication Avasaram Ledu)
========================================================= */

// GET /api/updates/public -> Published updates matrame load cheyadaniki
router.get('/public', getPublicUpdatesController);


/* =========================================================
   PROTECTED / ADMIN ROUTES (Authentication Mandatory)
   (Note: Token kavali anukunte 'verifyToken' ni middleware ga add cheyandi)
========================================================= */

// GET /api/updates -> Admin/Staff kosam all updates (drafts + published) & filters
router.get('/', getUpdatesController);

// GET /api/updates/:id -> Specific update ni ID dwara chudadaniki
router.get('/:id', getUpdateByIdController);

// POST /api/updates -> Kotha update create cheyadaniki
router.post('/', createUpdateController);

// PUT /api/updates/:id -> Unna update ni edit/update cheyadaniki
router.put('/:id', updateUpdateController);

// PATCH /api/updates/:id/publish -> Publish or Unpublish cheyadaniki
router.patch('/:id/publish', publishUpdateController);

// DELETE /api/updates/:id -> Update ni delete cheyadaniki
router.delete('/:id', deleteUpdateController);

export default router;