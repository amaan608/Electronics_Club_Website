// Loaded only into the integration test's disposable Next.js process.
import { generateKeyPairSync, sign } from "node:crypto";
const {privateKey,publicKey}=generateKeyPairSync("rsa",{modulusLength:2048});
const encode=value=>Buffer.from(JSON.stringify(value)).toString("base64url");
const original=globalThis.fetch;
globalThis.fetch=async function(input, options){
  const url=typeof input==="string"?input:input instanceof URL?input.href:input.url;
  if(url==="https://www.googleapis.com/oauth2/v3/certs")
    return Response.json({keys:[{...publicKey.export({format:"jwk"}),kid:"fixture",alg:"RS256",use:"sig"}]});
  if(url==="https://oauth2.googleapis.com/token"){
    const now=Math.floor(Date.now()/1000);
    const claims={iss:"https://accounts.google.com",aud:"fixture.apps.googleusercontent.com",sub:"fixture-member",
      name:"Google Member", email:"google@example.test",email_verified:true,iat:now,exp:now+300};
    const data=encode({alg:"RS256",kid:"fixture"})+"."+encode(claims);
    const idToken=data+"."+sign("RSA-SHA256",Buffer.from(data),privateKey).toString("base64url");
    return Response.json({token_type:"Bearer",expires_in:300,access_token:"fixture",id_token:idToken});
  }
  return original(input,options);
};

