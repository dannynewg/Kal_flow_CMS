import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

async function forward(request:NextRequest){
  const token=await getToken({req:request,secret:process.env.AUTH_SECRET});
  if(typeof token?.accessToken !== 'string')return Response.json({message:'Authentication required'},{status:401});
  const response=await fetch(`${process.env.API_URL ?? 'http://localhost:4000'}/v1/organizations`,{method:request.method,headers:{authorization:`Bearer ${token.accessToken}`,'content-type':'application/json'},body:request.method==='GET'?undefined:await request.text(),cache:'no-store'});
  return new Response(await response.text(),{status:response.status,headers:{'content-type':response.headers.get('content-type') ?? 'application/json'}});
}
export const GET=forward;
export const POST=forward;
