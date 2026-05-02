//@ts-nocheck
import{auth}from"@/auth";
import{buildExtensionCorsHeaders,isAllowedExtensionOrigin}from"@/lib/api/cors";
import{issueExtensionLinkTokenForUser}from"@/lib/extension/service";

function buildHeaders(req){
return buildExtensionCorsHeaders(req,{methods:["POST","OPTIONS"]});
}

function json(req,body,status){
return new Response(JSON.stringify(body),{status,headers:buildHeaders(req)});
}

export async function POST(req){
if(!isAllowedExtensionOrigin(req)){
return json(req,{message:"OriginNotAllowed"},403);
}
const session=await auth();
if(!session?.user?.id){
return json(req,{message:"Unauthorized"},401);
}
const result=await issueExtensionLinkTokenForUser({userId:session.user.id,email:session.user.email});
if(!result){
return json(req,{message:"Unauthorized"},401);
}
return json(req,{linkToken:result.linkToken,expiresAt:result.expiresAt.toISOString()},200);
}

export function OPTIONS(req){
const headers=buildHeaders(req);
if(!isAllowedExtensionOrigin(req)){
return new Response(null,{status:403,headers});
}
return new Response(null,{status:200,headers});
}
