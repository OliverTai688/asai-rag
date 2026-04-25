/**
 * 模擬 AI 串流回應工具
 * 接受一個完整字串，並返回一個可供 ReadableStream 讀取的 Uint8Array。
 */
export function streamScriptedResponse(
  fullText: string,
  opts: { chunkSize?: number; delayMs?: [number, number] } = {},
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const chunks = Array.from(fullText); // 逐字串流（支援中韓日文）
  const { delayMs = [30, 80] } = opts;

  return new ReadableStream({
    async pull(controller) {
      if (chunks.length === 0) {
        controller.close();
        return;
      }

      // 隨機延遲，模擬真 AI 渲染感
      const delay = delayMs[0] + Math.random() * (delayMs[1] - delayMs[0]);
      await new Promise((r) => setTimeout(r, delay));

      const char = chunks.shift();
      if (char) {
        controller.enqueue(encoder.encode(char));
      }
    },
  });
}

/**
 * 模擬延遲工具
 */
export async function mockDelay(ms?: number) {
  const delay = ms ?? (500 + Math.random() * 1500);
  return new Promise((r) => setTimeout(r, delay));
}
