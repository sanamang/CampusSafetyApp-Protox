import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { getIO } from '../socket';

const router = Router();
router.use(authenticate);

router.post('/', async (req: AuthRequest, res: Response) => {
  const { latitude, longitude, alert_type = 'SOS', notes } = req.body;
  if (latitude == null || longitude == null) {
    res.status(400).json({ error: 'latitude and longitude are required' });
    return;
  }
  try {
    const result = await query(
      `INSERT INTO alerts (student_id, alert_type, latitude, longitude, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user!.id, alert_type, latitude, longitude, notes || null]
    );
    const alert = result.rows[0];
    const io = getIO();
    io.to('admins').emit('alert:new', alert);
    io.to('officers').emit('alert:new', alert);
    res.status(201).json({ alert });
  } catch {
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

router.get('/', requireRole('admin'), async (_req, res: Response) => {
  try {
    const result = await query(
      `SELECT a.*, u.name as student_name, u.email as student_email,
              u.student_id as student_number, u.emergency_contact_name, u.emergency_contact_phone
       FROM alerts a LEFT JOIN users u ON a.student_id = u.id
       ORDER BY a.created_at DESC`
    );
    res.json({ alerts: result.rows });
  } catch {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

router.get('/mine', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM alerts WHERE student_id = $1 ORDER BY created_at DESC',
      [req.user!.id]
    );
    res.json({ alerts: result.rows });
  } catch {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT a.*, u.name as student_name, u.email as student_email
       FROM alerts a LEFT JOIN users u ON a.student_id = u.id
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }
    res.json({ alert: result.rows[0] });
  } catch {
    res.status(500).json({ error: 'Failed to fetch alert' });
  }
});

router.patch('/:id', requireRole('admin', 'officer'), async (req: AuthRequest, res: Response) => {
  const { status, assigned_officer_id, notes } = req.body;
  try {
    const existing = await query('SELECT * FROM alerts WHERE id = $1', [req.params.id]);
    if (!existing.rows[0]) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }
    const resolvedAt = status === 'resolved' ? 'NOW()' : 'NULL';
    const result = await query(
      `UPDATE alerts SET
         status = COALESCE($1, status),
         assigned_officer_id = COALESCE($2, assigned_officer_id),
         notes = COALESCE($3, notes),
         resolved_at = ${resolvedAt}
       WHERE id = $4 RETURNING *`,
      [status || null, assigned_officer_id || null, notes || null, req.params.id]
    );
    const alert = result.rows[0];
    const io = getIO();
    io.to(`alert:${alert.id}`).emit('alert:updated', alert);
    io.to('admins').emit('alert:updated', alert);
    res.json({ alert });
  } catch {
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

router.delete('/:id', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await query('DELETE FROM alerts WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }
    res.json({ message: 'Alert deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

export default router;
