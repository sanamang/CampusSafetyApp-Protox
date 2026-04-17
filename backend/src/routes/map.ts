import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/officers', async (_req, res: Response) => {
  try {
    const result = await query(
      `SELECT ol.officer_id, ol.latitude, ol.longitude, ol.last_updated, u.name
       FROM officer_locations ol JOIN users u ON ol.officer_id = u.id
       WHERE ol.last_updated > NOW() - INTERVAL '10 minutes'`
    );
    res.json({ officers: result.rows });
  } catch {
    res.status(500).json({ error: 'Failed to fetch officer locations' });
  }
});

router.get('/alerts', async (_req, res: Response) => {
  try {
    const result = await query(
      `SELECT id, alert_type, latitude, longitude, status, created_at
       FROM alerts WHERE status IN ('pending','acknowledged')
       ORDER BY created_at DESC`
    );
    res.json({ alerts: result.rows });
  } catch {
    res.status(500).json({ error: 'Failed to fetch active alerts' });
  }
});

export default router;
