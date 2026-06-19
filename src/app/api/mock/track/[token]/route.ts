import { blockMockApiInProduction } from "../../_lib/mock-api-guard";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const blocked = blockMockApiInProduction();
  if (blocked) return blocked;

  const { token } = await params;
  
  console.log(`[TRACKING] Report accessed with token: ${token}`);
  
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
