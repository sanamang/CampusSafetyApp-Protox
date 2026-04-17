import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';

const router = Router();
router.use(authenticate);

router.get('/', requireRole('admin'), async (_req, res: Response) => {
  try {
    const result = await query(
      'SELECT id, name, email, role, student_id, emergency_contact_name, emergency_contact_phone, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ users: result.rows });
  } catch {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'admin' && req.user!.id !== req.params.id) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  try {
    const result = await query(
      'SELECT id, name, email, role, student_id, emergency_contact_name, emergency_contact_phone, profile_photo_url, created_at FROM users WHERE id = $1',
      [req.params.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user: result.rows[0] });
  } catch {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.patch('/:id', async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== 'admin' && req.user!.id !== req.params.id) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  const { name, emergency_contact_name, emergency_contact_phone, profile_photo_url } = req.body;
  try {
    const result = await query(
      `UPDATE users SET
         name = COALESCE($1, name),
         emergency_contact_name = COALESCE($2, emergency_contact_name),
         emergency_contact_phone = COALESCE($3, emergency_contact_phone),
         profile_photo_url = COALESCE($4, profile_photo_url)
       WHERE id = $5
       RETURNING id, name, email, role, student_id, emergency_contact_name, emergency_contact_phone, profile_photo_url`,
      [name || null, emergency_contact_name || null, emergency_contact_phone || null, profile_photo_url || null, req.params.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user: result.rows[0] });
  } catch {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

export default router;
