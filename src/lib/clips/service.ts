//@ts-nocheck
import{prisma}from"@/lib/prisma";

type ClipWriteOwner={userId:string;ownerName:string;};

export function resolveClipOwnerName(user:any){
if(user.name){
const trimmed=user.name.trim();
if(trimmed){
return trimmed;
}
}
if(user.email){
const trimmed=user.email.trim();
if(trimmed){
return trimmed;
}
}
return user.id;
}

function buildClipCreateData(clip:any,owner:ClipWriteOwner){
const data:any={
clipName:clip.clipName?clip.clipName:undefined,
user:owner.ownerName,
userId:owner.userId,
service:clip.service,
startTime:clip.startTime,
endTime:clip.endTime,
url:clip.url,
title:clip.title,
};
if(clip.epnumber){
data.epnumber=clip.epnumber;
}
if(clip.createdAt){
data.createdAt=clip.createdAt;
}
return data;
}

export async function createClipRecord(db:any,clip:any,owner:ClipWriteOwner){
return db.clip.create({data:buildClipCreateData(clip,owner)});
}

export async function createClipRecords(db:any,clips:any[],owner:ClipWriteOwner){
const items=[];
for(const clip of clips){
items.push(await createClipRecord(db,clip,owner));
}
return items;
}

export async function writeClipBatch(clips:any[],owner:ClipWriteOwner){
return prisma.$transaction(async function(tx){
return createClipRecords(tx,clips,owner);
});
}
