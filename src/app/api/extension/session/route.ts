//@ts-nocheck
import{buildExtensionCorsHeaders,isAllowedClipWriteOrigin}from"@/lib/api/cors";
import{authenticateExtensionAuthToken,parseBearerToken}from"@/lib/extension/service";

function buildHeaders(req){
return buildExtensionCorsHeaders(req,{methods:["GET","OPTIONS"]});
}

function json(req,body,status){
return new Response(JSON.stringify(body),{status,headers:buildHeaders(req)});
}

export async function GET(req){
if(!isAllowedClipWriteOrigin(req)){
return json(req,{message:"OriginNotAllowed"},403);
}
const token=parseBearerToken(req.headers.get("authorization"));
if(!token){
return json(req,{message:"Unauthorized"},401);
}
const result=await authenticateExtensionAuthToken(token);
if(!result.ok){
return json(req,{message:"Unauthorized"},401);
}
return json(req,{userId:result.linkedExtension.userId,extensionInstanceId:result.linkedExtension.extensionInstanceId},200);
}

export function OPTIONS(req){
const headers=buildHeaders(req);
if(!isAllowedClipWriteOrigin(req)){
return new Response(null,{status:403,headers});
}
return new Response(null,{status:200,headers});
}
