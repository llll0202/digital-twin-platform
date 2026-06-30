export type DeviceMetric = {
  name: string;
  value: number | string;
  unit?: string;
};

export type DeviceStatus = {
  name: string;
  key: string;
  metrics: DeviceMetric[];
};

export type AnalyzeDevicesPayload = {
  factory: string;
  devices: DeviceStatus[];
};

export type AiAnalyzeResult = {
  level: 'normal' | 'warning' | 'danger' | string;
  summary: string;
  risks: string[];
  suggestions: string[];
};

const AI_ANALYZE_URL = 'http://localhost:8080/api/ai';

export async function analyzeDevices(payload: AnalyzeDevicesPayload): Promise<AiAnalyzeResult> {
  const response = await fetch(AI_ANALYZE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`AI analysis request failed: ${response.status}`);
  }

  return response.json();
}
