import { auth } from "@/auth";
import { buildClipWriteCorsHeaders, isAllowedClipWriteOrigin } from "@/lib/api/cors";
import { normalizeClipBatchPayload } from "@/lib/clips/contract";
import { resolveClipWriteOwnerFromSessionUser, resolveClipWriteOwnerFromBearerToken, writeClipBatch } from "@/lib/clips/service";
import { parseBearerToken } from "@/lib/extension/service";

async function handleClipWrite(req){
const headers=buildClipWriteCorsHeaders(req);
if(!isAllowedClipWriteOrigin(req)){
return new Response(JSON.stringify({ message: "Origin not allowed" }),{ status: 403, headers });
}

let owner=null;

const bearerToken=parseBearerToken(req.headers.get("authorization"));
if(bearerToken){
owner=await resolveClipWriteOwnerFromBearerToken(bearerToken);
}

if(!owner){
const session=await auth();
if(session?.user?.id){
owner=await resolveClipWriteOwnerFromSessionUser(session.user);
}
}

if(!owner){
return new Response(JSON.stringify({ message: "Unauthorized" }),{ status: 401, headers });
}

let body;
try{
body=await req.json();
}catch(error){
return new Response(JSON.stringify({ message: "Invalid JSON", error: String(error) }),{ status: 400, headers });
}

const normalized=normalizeClipBatchPayload(body);
if(!normalized.ok){
return new Response(JSON.stringify({ message: "Validation failed", issues: normalized.issues }),{ status: 400, headers });
}
if(normalized.clips.length===0){
return new Response(JSON.stringify({ message: "保存完了", savedCount: 0, items: [], result: null }),{ status: 200, headers });
}

try{
const items=await writeClipBatch(normalized.clips,owner);
return new Response(JSON.stringify({ message: "保存完了", savedCount: items.length, items, result: items[0]?items[0]:null }),{ status: 200, headers });
}catch(error){
console.error("POST /api/receive error:",error);
return new Response(JSON.stringify({ message: "保存失敗", error: String(error) }),{ status: 500, headers });
}
}

export async function POST(req){
return handleClipWrite(req);
}

export function OPTIONS(req){
const headers=buildClipWriteCorsHeaders(req);
if(!isAllowedClipWriteOrigin(req)){
return new Response(null,{ status: 403, headers });
}
return new Response(null,{ status: 200, headers });
}
