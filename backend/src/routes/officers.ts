import { Router, Response } from 'express';
import { query } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { getIO } from '../socket';

const router = Router();
router.use(authenticate);

router.get('/nearby', async (req: AuthRequest, res: Response) => {
  const { lat, lng, radius = 500 } = req.query;
  if (!lat || !lng) {
    res.status(400).json({ error: 'lat and lng are required' });
    return;
  }
  try {
    // simple bounding box approximation (~111km per degree)
    const deg = Number(radius) / 111000;
    const result = await query(
      `SELECT ol.*, u.name, u.email
       FROM officer_locations ol JOIN users u ON ol.officer_id = u.id
       WHERE ol.latitude BETWEEN $1 AND $2
         AND ol.longitude BETWEEN $3 AND $4
         AND ol.last_updated > NOW() - INTERVAL '5 minutes'`,
      [Number(lat) - deg, Number(lat) + deg, Number(lng) - deg, Number(lng) + deg]
    );
    res.json({ officers: result.rows });
  } catch {
    res.status(500).json({ error: 'Failed to fetch nearby officers' });
  }
});

router.post('/location', requireRole('officer', 'admin'), async (req: AuthRequest, res: Response) => {
  const { latitude, longitude } = req.body;
  if (latitude == null || longitude == null) {
    res.status(400).json({ error: 'latitude and longitude are required' });
    return;
  }
  try {
    const result = await query(
      `INSERT INTO officer_locations (officer_id, latitude, longitude, last_updated)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (officer_id) DO UPDATE
         SET latitude = EXCLUDED.latitude,
             longitude = EXCLUDED.longitude,
             last_updated = NOW()
       RETURNING *`,
      [req.user!.id, latitude, longitude]
    );
    const location = result.rows[0];
    const io = getIO();
    io.to('admins').emit('officer:location', { officer_id: req.user!.id, latitude, longitude });
    res.json({ location });
  } catch {
    res.status(500).json({ error: 'Failed to update location' });
  }
});

export default router;
