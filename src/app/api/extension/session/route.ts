//@ts-nocheck
import{buildExtensionCorsHeaders,isAllowedExtensionOrigin}from"@/lib/api/cors";
import{resolveLinkedExtension}from"@/lib/extension/service";

function buildHeaders(req){
return buildExtensionCorsHeaders(req,{methods:["GET","OPTIONS"]});
}

function json(req,body,status){
return new Response(JSON.stringify(body),{status,headers:buildHeaders(req)});
}

export async function GET(req){
if(!isAllowedExtensionOrigin(req)){
return json(req,{message:"OriginNotAllowed"},403);
}
const result=await resolveLinkedExtension(req.headers.get("x-extension-instance-id"));
if(!result.ok){
return json(req,{message:"Unauthorized"},401);
}
return json(req,{userId:result.linkedExtension.userId,extensionInstanceId:result.linkedExtension.extensionInstanceId},200);
}

export function OPTIONS(req){
const headers=buildHeaders(req);
if(!isAllowedExtensionOrigin(req)){
return new Response(null,{status:403,headers});
}
return new Response(null,{status:200,headers});
}
