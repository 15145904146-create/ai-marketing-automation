// ===== AI圈人 (Audience Targeting) Service via IDEAs API =====
// Calls via Vite proxy: /api/ideas -> https://aistudio.alibaba-inc.com/api/aiapp/run/kwyxilIBTkm/latest

const API_URL = '/api/ideas';

const X_AK = import.meta.env.VITE_SEGMENT_X_AK || 'YOUR_X_AK_HERE';

let sessionId = '';

function getSessionId(): string {
  if (!sessionId) {
    sessionId = crypto.randomUUID().replace(/-/g, '').toUpperCase();
  }
  return sessionId;
}

export function resetSegmentSession(): void {
  sessionId = '';
}

// ===== Non-streaming call =====
export async function callSegmentAPI(question: string): Promise<string> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-AK': X_AK,
    },
    body: JSON.stringify({
      empId: '000000',
      sessionId: getSessionId(),
      question,
      stream: false,
      returnRunLog: false,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`IDEAs API error ${res.status}: ${errText}`);
  }

  const data = await res.json();

  if (!data.success) {
    throw new Error(`IDEAs API error: ${data.errorCode} - ${data.errorMsg}`);
  }

  return data.data?.content || 'AI圈人未返回结果';
}

// ===== Streaming call =====
export async function callSegmentStream(
  question: string,
  onChunk: (accumulated: string) => void,
): Promise<string> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-AK': X_AK,
    },
    body: JSON.stringify({
      empId: '000000',
      sessionId: getSessionId(),
      question,
      stream: true,
      returnRunLog: false,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`IDEAs API error ${res.status}: ${errText}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let accumulated = '';
  let buffer = '';
  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const payload = trimmed.slice(6);
      if (payload === '[DONE]') continue;

      try {
        const json = JSON.parse(payload);

        if (!json.success && !json.data?.content) {
          console.warn('[Segment] Stream error:', json.errorCode, json.errorMsg);
          continue;
        }

        const content = json.data?.content || '';
        if (content) {
          fullContent = content; // IDEAs streams accumulated content, not deltas

          // Wrap in SmartRenderer JSON format if not already JSON
          if (content.startsWith('{') || content.startsWith('[')) {
            accumulated = content;
          } else {
            // Wrap plain text in a text section
            accumulated = JSON.stringify({
              stage: 'clarification',
              sections: [{ type: 'text', content }],
            });
          }

          onChunk(accumulated);
        }
      } catch {
        // skip malformed SSE lines
      }
    }
  }

  if (!fullContent) {
    fullContent = 'AI圈人未返回结果';
    accumulated = JSON.stringify({
      stage: 'clarification',
      sections: [{ type: 'text', content: fullContent }],
    });
    onChunk(accumulated);
  }

  return accumulated;
}
