const allowedOriginsEnv=process.env.CLIP_API_ALLOWED_ORIGINS?process.env.CLIP_API_ALLOWED_ORIGINS:"";
const CLIP_WRITE_ALLOWED_ORIGINS=[process.env.NEXTAUTH_URL,...allowedOriginsEnv.split(",")];
const normalizedClipWriteAllowedOrigins=CLIP_WRITE_ALLOWED_ORIGINS.map(function(value){return value?value.trim():value;});
const CLIP_WRITE_ALLOWED_ORIGINS_NORMALIZED=normalizedClipWriteAllowedOrigins.filter(Boolean);

export function isAllowedClipWriteOrigin(request){
const origin=request.headers.get("origin");
if(!origin){
return true;
}
return CLIP_WRITE_ALLOWED_ORIGINS_NORMALIZED.includes(origin);
}

export function buildClipWriteCorsHeaders(request){
const origin=request.headers.get("origin");
const headers={
"Content-Type":"application/json",
"Access-Control-Allow-Methods":"POST, OPTIONS",
"Access-Control-Allow-Headers":"Content-Type",
Vary:"Origin",
};
if(origin){
if(isAllowedClipWriteOrigin(request)){
headers["Access-Control-Allow-Origin"]=origin;
headers["Access-Control-Allow-Credentials"]="true";
}
}
return headers;
}
