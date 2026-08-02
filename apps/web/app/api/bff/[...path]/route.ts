import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

const allowedSegment = /^[a-zA-Z0-9_-]+$/;
const mutatingMethods = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  if (!path.length || path.some((segment) => !allowedSegment.test(segment))) {
    return Response.json({ message: 'Invalid API path' }, { status: 400 });
  }

  if (mutatingMethods.has(request.method)) {
    const fetchSite = request.headers.get('sec-fetch-site');
    if (fetchSite && !['same-origin', 'none'].includes(fetchSite)) {
      return Response.json({ message: 'Cross-site request rejected' }, { status: 403 });
    }
  }

  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
  if (typeof token?.accessToken !== 'string') {
    return Response.json({ message: 'Authentication required' }, { status: 401 });
  }

  const apiUrl = process.env.API_URL ?? 'http://localhost:4000';
  const upstreamUrl = new URL(`/v1/${path.map(encodeURIComponent).join('/')}`, apiUrl);
  upstreamUrl.search = request.nextUrl.search;
  const headers = new Headers({ authorization: `Bearer ${token.accessToken}` });
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);

  let body: ArrayBuffer | undefined;
  if (!['GET', 'HEAD'].includes(request.method)) body = await request.arrayBuffer();

  try {
    const response = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
    });
    const responseHeaders = new Headers();
    responseHeaders.set('content-type', response.headers.get('content-type') ?? 'application/json');
    return new Response(response.body, { status: response.status, headers: responseHeaders });
  } catch {
    return Response.json({ message: 'The Kal_flow API is unavailable' }, { status: 502 });
  }
}

export const dynamic = 'force-dynamic';
export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const PUT = forward;
export const DELETE = forward;
