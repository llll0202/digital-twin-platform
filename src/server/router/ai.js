import express from 'express';
import { analyzeDeviceStatus } from '../aiservers/aiService.js';
const router = express.Router();

router.post('/api/ai', (req, res) => {
  const { devices = [] } = req.body;
  const result = analyzeDeviceStatus(devices);
  res.send(result);
});

export default router;
