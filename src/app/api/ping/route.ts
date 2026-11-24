/** Keep-alive. The request itself is what matters: proxy.ts slides the session's idle clock forward on every call. */
export function GET() {
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}
