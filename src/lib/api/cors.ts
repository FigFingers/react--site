const allowedOriginsEnv=process.env.CLIP_API_ALLOWED_ORIGINS?process.env.CLIP_API_ALLOWED_ORIGINS:"";
const CLIP_WRITE_ALLOWED_ORIGINS=[process.env.NEXTAUTH_URL,...allowedOriginsEnv.split(",")];
const normalizedClipWriteAllowedOrigins=CLIP_WRITE_ALLOWED_ORIGINS.map(function(value){return value?value.trim():value;});
const CLIP_WRITE_ALLOWED_ORIGINS_NORMALIZED=normalizedClipWriteAllowedOrigins.filter(Boolean);
const DEFAULT_ALLOWED_HEADERS=["Content-Type","Authorization","X-Extension-Instance-Id"];
const CHROME_EXTENSION_ORIGIN_PREFIX="chrome-extension://";

function buildCorsHeaders(request,options){
const config=options?options:{};
const methods=config.methods?config.methods:["POST","OPTIONS"];
const allowHeaders=config.allowHeaders?config.allowHeaders:DEFAULT_ALLOWED_HEADERS;
const isAllowed=typeof config.isAllowed==="function"?config.isAllowed:isAllowedClipWriteOrigin;
const origin=request.headers.get("origin");
const headers={
"Content-Type":"application/json",
"Access-Control-Allow-Methods":methods.join(", "),
"Access-Control-Allow-Headers":allowHeaders.join(", "),
Vary:"Origin",
};
if(origin){
if(isAllowed(request)){
headers["Access-Control-Allow-Origin"]=origin;
headers["Access-Control-Allow-Credentials"]="true";
}
}
return headers;
}

export function isAllowedClipWriteOrigin(request){
const origin=request.headers.get("origin");
if(!origin){
return true;
}
try{
const requestOrigin=new URL(request.url).origin;
if(origin===requestOrigin){
return true;
}
}catch{
}
return CLIP_WRITE_ALLOWED_ORIGINS_NORMALIZED.includes(origin);
}

// /api/extension/* 用: chrome-extension://<id> origin も許可する。
// これらのエンドポイントは linkToken / Bearer JWT で個別に認証されるため、
// Origin チェックは defense-in-depth に留めて拡張機能のサービスワーカーから
// 直接呼び出せるようにする。
export function isAllowedExtensionOrigin(request){
const origin=request.headers.get("origin");
if(typeof origin==="string"&&origin.startsWith(CHROME_EXTENSION_ORIGIN_PREFIX)){
return true;
}
return isAllowedClipWriteOrigin(request);
}

export function buildClipWriteCorsHeaders(request,options){
return buildCorsHeaders(request,options);
}

export function buildExtensionCorsHeaders(request,options){
const config=options?options:{};
const methods=config.methods?config.methods:["GET","POST","OPTIONS"];
return buildCorsHeaders(request,{methods,allowHeaders:DEFAULT_ALLOWED_HEADERS,isAllowed:isAllowedExtensionOrigin});
}
