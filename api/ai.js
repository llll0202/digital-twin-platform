import { analyzeDeviceStatus } from '../src/server/aiservers/aiService.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { devices = [] } = req.body || {};
  const result = analyzeDeviceStatus(devices);

  return res.status(200).json(result);
}
