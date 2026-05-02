//@ts-nocheck
import{prisma}from"@/lib/prisma";
import{normalizeClipBatchPayload}from"@/lib/clips/contract";
import{Prisma}from"@prisma/client";
import{createHash,randomBytes,timingSafeEqual}from"node:crypto";
import{SignJWT,jwtVerify}from"jose";

const LINK_TOKEN_TTL_MS=10*60*1000;
const UUID_PATTERN=new RegExp("\x5e[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\x24","i");

function isRecord(value){
return typeof value==="object"&&value!==null&&!Array.isArray(value);
}

function generateOpaqueToken(size=32){
return randomBytes(size).toString("base64url");
}

function hashOpaqueToken(token){
return createHash("sha256").update(token).digest("hex");
}

function tokenHashMatches(token,expectedHash){
const actualHash=hashOpaqueToken(token);
if(actualHash.length!==expectedHash.length){
return false;
}
return timingSafeEqual(Buffer.from(actualHash,"hex"),Buffer.from(expectedHash,"hex"));
}

function normalizeRequiredString(value,index,field,issues){
const text=typeof value==="string"?value.trim():"";
if(!text){
issues.push({index,field,message:field+"IsRequired"});
return null;
}
return text;
}

function normalizeUuid(value,index,field,issues){
const text=normalizeRequiredString(value,index,field,issues);
if(!text){
return null;
}
if(!UUID_PATTERN.test(text)){
issues.push({index,field,message:field+"MustBeUuid"});
return null;
}
return text;
}

function normalizeCreatedAt(value,index,issues){
if(value===undefined||value===null||value===""){
return null;
}
if(typeof value!=="string"){
issues.push({index,field:"createdAt",message:"createdAtMustBeIsoDatetime"});
return null;
}
const parsed=new Date(value);
if(Number.isNaN(parsed.getTime())){
issues.push({index,field:"createdAt",message:"createdAtMustBeIsoDatetime"});
return null;
}
return parsed;
}

export function parseBearerToken(authorizationHeader){
if(!authorizationHeader){
return null;
}
const match=authorizationHeader.trim().match(/^Bearer\s+(.+)$/i);
if(!match){
return null;
}
const token=match[1].trim();
return token||null;
}

export function normalizeExtensionLinkPayload(body){
if(!isRecord(body)){
return {ok:false,issues:[{index:-1,field:"body",message:"bodyMustBeObject"}]};
}
const issues=[];
const extensionInstanceId=normalizeUuid(body.extensionInstanceId,-1,"extensionInstanceId",issues);
const linkToken=normalizeRequiredString(body.linkToken,-1,"linkToken",issues);
if(issues.length>0||!extensionInstanceId||!linkToken){
return {ok:false,issues};
}
return {ok:true,extensionInstanceId,linkToken};
}

export function normalizeExtensionSyncPayload(body){
if(!isRecord(body)){
return {ok:false,issues:[{index:-1,field:"body",message:"bodyMustBeObject"}]};
}
const issues=[];
const extensionInstanceId=normalizeUuid(body.extensionInstanceId,-1,"extensionInstanceId",issues);
if(!Array.isArray(body.items)){
issues.push({index:-1,field:"items",message:"itemsMustBeArray"});
}
const items=[];
if(Array.isArray(body.items)){
for(let index=0;index<body.items.length;index+=1){
const rawItem=body.items[index];
if(!isRecord(rawItem)){
issues.push({index,field:"items",message:"itemMustBeObject"});
continue;
}
const clientItemId=normalizeUuid(rawItem.clientItemId,index,"clientItemId",issues);
const type=normalizeRequiredString(rawItem.type,index,"type",issues);
const createdAt=normalizeCreatedAt(rawItem.createdAt,index,issues);
if(type&&type!=="clip"){
issues.push({index,field:"type",message:"typeMustBeClip"});
}
if(!isRecord(rawItem.payload)){
issues.push({index,field:"payload",message:"payloadMustBeObject"});
continue;
}
const normalizedPayload=normalizeClipBatchPayload(rawItem.payload);
if(!normalizedPayload.ok){
for(const issue of normalizedPayload.issues){
issues.push({index,field:"payload."+issue.field,message:issue.message});
}
continue;
}
if(normalizedPayload.clips.length!==1){
issues.push({index,field:"payload",message:"payloadMustContainExactlyOneClip"});
continue;
}
if(!clientItemId||type!=="clip"){
continue;
}
items.push({clientItemId,type:"clip",payload:normalizedPayload.clips[0],createdAt});
}
}
if(issues.length>0||!extensionInstanceId){
return {ok:false,issues};
}
return {ok:true,extensionInstanceId,items};
}

function getJwtSecret(){
const secret=process.env.EXTENSION_JWT_SECRET;
if(!secret)throw new Error("EXTENSION_JWT_SECRET is not set");
return new TextEncoder().encode(secret);
}

async function generateExtensionJwt(userId,extensionInstanceId){
return new SignJWT({userId,extensionInstanceId})
.setProtectedHeader({alg:"HS256"})
.setIssuedAt()
.setExpirationTime("30d")
.sign(getJwtSecret());
}

export async function verifyExtensionAuthToken(token){
try{
const{payload}=await jwtVerify(token,getJwtSecret());
const userId=typeof payload.userId==="string"?payload.userId:null;
const extensionInstanceId=typeof payload.extensionInstanceId==="string"?payload.extensionInstanceId:null;
if(!userId||!extensionInstanceId)return null;
return{userId,extensionInstanceId};
}catch{
return null;
}
}

async function authenticateExtensionToken(args){
const jwtPayload=await verifyExtensionAuthToken(args.extensionAuthToken);
if(!jwtPayload){
return {ok:false,status:401,message:"Unauthorized"};
}
const extensionInstanceId=args.extensionInstanceId||jwtPayload.extensionInstanceId;
if(jwtPayload.extensionInstanceId!==extensionInstanceId){
return {ok:false,status:401,message:"Unauthorized"};
}
const linkedExtension=await prisma.linkedExtension.findUnique({where:{extensionInstanceId},select:{id:true,userId:true,extensionInstanceId:true,extensionAuthHash:true,revokedAt:true,user:{select:{id:true,name:true,nickname:true,email:true}}}});
if(!linkedExtension||linkedExtension.revokedAt){
return {ok:false,status:401,message:"Unauthorized"};
}
if(linkedExtension.userId!==jwtPayload.userId){
return {ok:false,status:401,message:"Unauthorized"};
}
if(!tokenHashMatches(args.extensionAuthToken,linkedExtension.extensionAuthHash)){
return {ok:false,status:401,message:"Unauthorized"};
}
return {ok:true,linkedExtension:{id:linkedExtension.id,userId:linkedExtension.userId,extensionInstanceId:linkedExtension.extensionInstanceId,user:linkedExtension.user}};
}

export async function authenticateExtensionAuthToken(extensionAuthToken){
return authenticateExtensionToken({extensionAuthToken});
}

export async function issueExtensionLinkToken(userId){
return issueExtensionLinkTokenForUser({userId});
}

export async function issueExtensionLinkTokenForUser(args){
let user=null;
if(args.userId){
user=await prisma.user.findUnique({where:{id:args.userId},select:{id:true}});
}
if(!user&&args.email){
user=await prisma.user.findUnique({where:{email:args.email},select:{id:true}});
}
if(!user){
return null;
}
const linkToken=generateOpaqueToken();
const expiresAt=new Date(Date.now()+LINK_TOKEN_TTL_MS);
try{
await prisma.extensionLinkToken.create({data:{userId:user.id,tokenHash:hashOpaqueToken(linkToken),expiresAt}});
}catch(error){
if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2003"){
return null;
}
throw error;
}
return {linkToken,expiresAt};
}

export async function consumeLinkTokenAndLinkExtension(args){
const tokenHash=hashOpaqueToken(args.linkToken);
const now=new Date();
return prisma.$transaction(async function(tx){
const linkTokenRecord=await tx.extensionLinkToken.findUnique({where:{tokenHash},select:{id:true,userId:true,expiresAt:true,usedAt:true}});
if(!linkTokenRecord){
return {ok:false,status:401,message:"InvalidLinkToken"};
}
if(linkTokenRecord.usedAt){
return {ok:false,status:409,message:"LinkTokenAlreadyUsed"};
}
if(linkTokenRecord.expiresAt.getTime()<=now.getTime()){
return {ok:false,status:410,message:"LinkTokenExpired"};
}
const consumed=await tx.extensionLinkToken.updateMany({where:{id:linkTokenRecord.id,usedAt:null},data:{usedAt:now}});
if(consumed.count!==1){
return {ok:false,status:409,message:"LinkTokenAlreadyUsed"};
}
const extensionAuthToken=await generateExtensionJwt(linkTokenRecord.userId,args.extensionInstanceId);
const extensionAuthHash=hashOpaqueToken(extensionAuthToken);
await tx.linkedExtension.upsert({where:{extensionInstanceId:args.extensionInstanceId},update:{userId:linkTokenRecord.userId,extensionAuthHash,linkedAt:now,lastSeenAt:now,revokedAt:null},create:{userId:linkTokenRecord.userId,extensionInstanceId:args.extensionInstanceId,extensionAuthHash,linkedAt:now,lastSeenAt:now}});
return {ok:true,extensionAuthToken};
});
}

export async function authenticateLinkedExtension(args){
return authenticateExtensionToken(args);
}
