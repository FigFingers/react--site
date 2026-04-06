//@ts-nocheck
import{auth}from"@/auth";
import{buildExtensionCorsHeaders,isAllowedClipWriteOrigin}from"@/lib/api/cors";

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
const session=await auth();
return json(req,{loggedIn:Boolean(session?.user?.id)},200);
}

export function OPTIONS(req){
const headers=buildHeaders(req);
if(!isAllowedClipWriteOrigin(req)){
return new Response(null,{status:403,headers});
}
return new Response(null,{status:200,headers});
}
