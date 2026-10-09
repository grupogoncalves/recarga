import admin from 'firebase-admin';
const email = process.env.FULLCHARGE_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.FULLCHARGE_ADMIN_PASSWORD;
if (!email || !password || password.length < 12) throw Error('Configure FULLCHARGE_ADMIN_EMAIL e FULLCHARGE_ADMIN_PASSWORD (mínimo 12 caracteres) nos Secrets.');
const credential=JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || 'null');
if (!credential) throw Error('Configure FIREBASE_SERVICE_ACCOUNT_JSON nos Secrets.');
admin.initializeApp({credential:admin.credential.cert(credential)});
let user;
try {user=await admin.auth().getUserByEmail(email)}
catch(e){if(e.code==='auth/user-not-found')user=await admin.auth().createUser({email,password,emailVerified:true});else throw e}
await admin.auth().setCustomUserClaims(user.uid,{...user.customClaims,admin:true});
console.log('Conta administrativa criada/autorizada. UID:',user.uid);
