import admin from 'firebase-admin';
const email=process.env.ADMIN_EMAIL?.trim();
if(!email)throw Error('Defina ADMIN_EMAIL no ambiente.');
const service=JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON||'null');
if(!service)throw Error('Defina FIREBASE_SERVICE_ACCOUNT_JSON somente em ambiente seguro.');
admin.initializeApp({credential:admin.credential.cert(service)});
const user=await admin.auth().getUserByEmail(email);
await admin.auth().setCustomUserClaims(user.uid,{...user.customClaims,admin:true});
console.log('Permissão administrativa configurada para UID:',user.uid);
