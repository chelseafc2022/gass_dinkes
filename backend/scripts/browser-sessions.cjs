// Creates short-lived sessions only in the isolated test database, never in a deployed app.
const fs=require('node:fs');
const {randomBytes}=require('node:crypto');
const {PrismaService}=require('../dist/src/prisma/prisma.service');
const {JwtService}=require('@nestjs/jwt');
if(!process.env.DATABASE_URL?.includes('gass_test'))throw new Error('Use the isolated gass_test database.');
const db=new PrismaService();
(async()=>{const output={};for(const [key,role] of Object.entries({admin:'ADMIN_DINKES',operator:'OPERATOR_PUSKESMAS'})){
 const user=await db.user.findFirstOrThrow({where:{role},orderBy:{createdAt:'desc'}});
 await db.user.update({where:{id:user.id},data:{isActive:true}});
 const session=await db.session.create({data:{userId:user.id,tokenHash:randomBytes(32).toString('hex'),expiresAt:new Date(Date.now()+3600000)}});
 const value=new JwtService().sign({sub:user.id,sid:session.id,type:'access'},{secret:process.env.JWT_ACCESS_SECRET,issuer:'gass',audience:'gass-web',expiresIn:'1h'});
 output[key]={name:user.name,faskesId:user.faskesId,cookie:{name:'gass_access',value,domain:'127.0.0.1',path:'/api',httpOnly:true,secure:false,sameSite:'Lax'}};
 }fs.writeFileSync('/private/tmp/gass-browser-sessions.json',JSON.stringify(output),{mode:0o600});console.log('Browser sessions prepared for isolated test users.');})().finally(()=>db.$disconnect());
