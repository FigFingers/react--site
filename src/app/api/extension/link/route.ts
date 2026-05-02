//@ts-nocheck
import{auth}from"@/auth";
import{buildExtensionCorsHeaders,isAllowedExtensionOrigin}from"@/lib/api/cors";
import{linkExtensionInstanceToUser,normalizeExtensionLinkPayload}from"@/lib/extension/service";

function buildHeaders(req){
return buildExtensionCorsHeaders(req,{methods:["POST","OPTIONS"]});
}

function json(req,body,status){
return new Response(JSON.stringify(body),{status,headers:buildHeaders(req)});
}

export async function POST(req){
const session=await auth();
if(!session?.user?.id){
return json(req,{message:"Unauthorized"},401);
}
if(!isAllowedExtensionOrigin(req)){
return json(req,{message:"OriginNotAllowed"},403);
}
let body;
try{
body=await req.json();
}catch(error){
return json(req,{message:"InvalidJson",error:String(error)},400);
}
const normalized=normalizeExtensionLinkPayload(body);
if(!normalized.ok){
return json(req,{message:"ValidationFailed",issues:normalized.issues},400);
}
const result=await linkExtensionInstanceToUser({userId:session.user.id,extensionInstanceId:normalized.extensionInstanceId});
if(!result){
return json(req,{message:"Unauthorized"},401);
}
return json(req,{ok:true,extensionAuthToken:result.extensionAuthToken},200);
}

export function OPTIONS(req){
const headers=buildHeaders(req);
if(!isAllowedExtensionOrigin(req)){
return new Response(null,{status:403,headers});
}
return new Response(null,{status:200,headers});
}
