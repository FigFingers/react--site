//@ts-nocheck
import{Prisma}from"@prisma/client";
import{prisma}from"@/lib/prisma";
import{buildExtensionCorsHeaders,isAllowedClipWriteOrigin}from"@/lib/api/cors";
import{createClipRecord,resolveClipOwnerName}from"@/lib/clips/service";
import{authenticateLinkedExtension,normalizeExtensionSyncPayload,parseBearerToken}from"@/lib/extension/service";

function buildHeaders(req){
return buildExtensionCorsHeaders(req,{methods:["POST","OPTIONS"]});
}

function json(req,body,status){
return new Response(JSON.stringify(body),{status,headers:buildHeaders(req)});
}

function dedupeItems(items){
const seen=new Set();
const deduped=[];
for(const item of items){
if(seen.has(item.clientItemId)){
continue;
}
seen.add(item.clientItemId);
deduped.push(item);
}
return deduped;
}

export async function POST(req){
if(!isAllowedClipWriteOrigin(req)){
return json(req,{message:"OriginNotAllowed"},403);
}
const extensionAuthToken=parseBearerToken(req.headers.get("authorization"));
if(!extensionAuthToken){
return json(req,{message:"Unauthorized"},401);
}
let body;
try{
body=await req.json();
}catch(error){
return json(req,{message:"InvalidJson",error:String(error)},400);
}
const normalized=normalizeExtensionSyncPayload(body);
if(!normalized.ok){
return json(req,{message:"ValidationFailed",issues:normalized.issues},400);
}
const authResult=await authenticateLinkedExtension({extensionInstanceId:normalized.extensionInstanceId,extensionAuthToken});
if(!authResult.ok){
return json(req,{message:authResult.message},authResult.status);
}
const owner={userId:authResult.linkedExtension.userId,ownerName:resolveClipOwnerName(authResult.linkedExtension.user)};
const dedupedItems=dedupeItems(normalized.items);
const acceptedItemIds=[];
const now=new Date();
try{
await prisma.$transaction(async function(tx){
const receiptIds=new Set();
if(dedupedItems.length){
const existingReceipts=await tx.syncReceipt.findMany({where:{linkedExtensionId:authResult.linkedExtension.id,clientItemId:{in:dedupedItems.map(function(item){return item.clientItemId;})}},select:{clientItemId:true}});
for(const receipt of existingReceipts){
receiptIds.add(receipt.clientItemId);
}
}
for(const item of dedupedItems){
if(receiptIds.has(item.clientItemId)){
acceptedItemIds.push(item.clientItemId);
continue;
}
try{
await tx.syncReceipt.create({data:{linkedExtensionId:authResult.linkedExtension.id,clientItemId:item.clientItemId,itemType:item.type}});
}catch(error){
if(error instanceof Prisma.PrismaClientKnownRequestError){
if(error.code==="P2002"){
receiptIds.add(item.clientItemId);
acceptedItemIds.push(item.clientItemId);
continue;
}
}
throw error;
}
await createClipRecord(tx,{...item.payload,createdAt:item.createdAt},owner);
receiptIds.add(item.clientItemId);
acceptedItemIds.push(item.clientItemId);
}
await tx.linkedExtension.update({where:{id:authResult.linkedExtension.id},data:{lastSeenAt:now}});
});
return json(req,{ok:true,acceptedItemIds},200);
}catch(error){
console.error("POST/api/extension/sync",error);
return json(req,{message:"SyncFailed",error:String(error)},500);
}
}

export function OPTIONS(req){
const headers=buildHeaders(req);
if(!isAllowedClipWriteOrigin(req)){
return new Response(null,{status:403,headers});
}
return new Response(null,{status:200,headers});
}
