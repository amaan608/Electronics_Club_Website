import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import net from "node:net";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { MongoClient } from "mongodb";
import { MongoMemoryReplSet } from "mongodb-memory-server-core";
import { SMTPServer } from "smtp-server";
import { generate } from "selfsigned";

async function freePort() {
  const server = net.createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

// Exercise the actual production HTTP handlers with disposable MongoDB and STARTTLS SMTP.
test("member authentication", { timeout: 1_800_000 }, async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "electronics-auth-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const replica = await MongoMemoryReplSet.create({
    binary: { downloadDir: path.resolve(".test-cache/mongodb") },
    replSet: { count: 1 },
  });
  t.after(() => replica.stop());
  const uri = replica.getUri("club_test");
  const mongo = await new MongoClient(uri).connect();
  t.after(() => mongo.close());
  const db = mongo.db();
  const cert = await generate([{ name: "commonName", value: "localhost" }], {
    algorithm: "sha256",
    extensions: [
      { name: "basicConstraints", cA: true },
      {
        name: "subjectAltName",
        altNames: [
          { type: 2, value: "localhost" },
          { type: 7, ip: "127.0.0.1" },
        ],
      },
    ],
  });
  const certPath = path.join(directory, "mail-ca.pem");
  await writeFile(certPath, cert.cert);
  const inbox = [];
  const mail = new SMTPServer({
    key: cert.private,
    cert: cert.cert,
    logger: false,
    onAuth(auth, session, done) {
      done(
        auth.username === "fixture" && auth.password === "fixture"
          ? null
          : new Error("Invalid test credentials"),
        { user: "fixture" },
      );
    },
    onData(stream, session, done) {
      const chunks = [];
      stream.on("data", (part) => chunks.push(part));
      stream.on("end", () => {
        const source = Buffer.concat(chunks)
          .toString()
          .replace(/=\r?\n/g, "");
        inbox.push({
          email: session.envelope.rcptTo[0].address,
          code: source.match(/\b\d{6}\b(?=<\/p>)/)?.[0],
        });
        done();
      });
    },
  });
  const mailPort = await freePort();
  await new Promise((resolve) => mail.listen(mailPort, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => mail.close(resolve)));
  const port = await freePort();
  const url = `http://127.0.0.1:${port}`;
  const server = spawn(
    process.execPath,
    [
      "--import",
      "./tests/google-fixture.mjs",
      "node_modules/next/dist/bin/next",
      "start",
      "-H",
      "127.0.0.1",
      "-p",
      String(port),
    ],
    {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        NODE_ENV: "production",
        MONGODB_URI: uri,
        BETTER_AUTH_URL: url,
        BETTER_AUTH_SECRET: randomBytes(48).toString("hex"),
        SMTP_HOST: "127.0.0.1",
        SMTP_PORT: String(mailPort),
        SMTP_USER: "fixture",
        SMTP_PASSWORD: "fixture",
        SMTP_FROM: "Club <club@example.test>",
        GOOGLE_CLIENT_ID: "fixture.apps.googleusercontent.com",
        GOOGLE_CLIENT_SECRET: "fixture",
        NODE_EXTRA_CA_CERTS: certPath,
      },
    },
  );
  let logs = "";
  server.stdout.on("data", (chunk) => {
    logs += chunk;
  });
  server.stderr.on("data", (chunk) => {
    logs += chunk;
  });
  t.after(() => {
    server.kill();
  });
  async function until(check, label, timeout = 20000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      const result = await check();
      if (result) return result;
      await delay(100);
    }
    throw new Error(label);
  }
  await until(async () => {
    try {
      return (await fetch(url)).ok;
    } catch {
      return false;
    }
  }, "Production server did not start");
  const jar = new Map();
  const cookie = () => [...jar].map(([k, v]) => k + "=" + v).join("; ");
  async function request(route, body, extraHeaders = {}) {
    const res = await fetch(url + route, {
      method: "POST",
      redirect: "manual",
      headers: {
        origin: url,
        "content-type": "application/json",
        cookie: cookie(),
        ...extraHeaders,
      },
      body: JSON.stringify(body),
    });
    remember(res);
    return res;
  }
  function remember(res) {
    for (const entry of res.headers.getSetCookie()) {
      const pair = entry.split(";")[0];
      const idx = pair.indexOf("=");
      jar.set(pair.slice(0, idx), pair.slice(idx + 1));
    }
  }
  const email = "member@example.test",
    password = "initial-example-password",
    nextPassword = "changed-example-password";
  const signup = {
    email,
    name: "Test Member",
    phone: "9876543210",
    password,
    confirmPassword: password,
    purpose: "register",
  };
  const route = "/api/member/";
  const reg = () => request(route + "request", signup);
  const login = (pw) =>
    request("/api/auth/sign-in/email", { email, password: pw });
  const verify = (purpose, code, address = email) =>
    request(route + "verify", { email: address, purpose, code });
  async function getCode(address) {
    const item = await until(
      () => inbox.find((m) => m.email === address),
      "OTP delivery failed or template did not contain a code.",
    );
    inbox.splice(inbox.indexOf(item), 1);
    assert.ok(item.code, "Expected a six-digit code in SMTP mail");
    assert.ok(!logs.includes(item.code), "OTP appeared in application logs");
    return item.code;
  }
  await t.test(
    "registration, pending access, resend cooldown and single use",
    async () => {
      const initial = await reg();
      assert.equal(initial.status, 200);
      assert.deepEqual(await initial.json(), { ok: true });
      const code = await getCode(email);
      assert.equal(await db.collection("user").countDocuments({ email }), 0);
      assert.equal((await login(password)).status, 401);
      assert.equal(
        (
          await request(route + "request", {
            email,
            purpose: "register",
            resend: true,
          })
        ).status,
        429,
      );
      const stored = await db
        .collection("otp_verifications")
        .findOne({ email, purpose: "register" });
      assert.equal(stored.otpHash.length, 64);
      assert.ok(stored.pendingPasswordHash !== password);
      assert.equal(stored.expiresAt - stored.sentAt, 300000);
      assert.equal((await verify("recover", code)).status, 400);
      const boundCookie = cookie();
      assert.equal((await verify("register", code)).status, 200);
      assert.equal(
        (
          await request(
            route + "verify",
            { email, purpose: "register", code },
            { cookie: boundCookie },
          )
        ).status,
        400,
      );
      assert.equal(
        await db
          .collection("user")
          .countDocuments({ email, emailVerified: true, role: "member" }),
        1,
      );
    },
  );
  let originalSession = "";
  await t.test(
    "password login, session persistence and protected account",
    async () => {
      const res = await login(password);
      assert.equal(res.status, 200);
      assert.ok(
        res.headers
          .getSetCookie()
          .some((c) => c.includes("HttpOnly") && c.includes("session_token")),
      );
      originalSession = cookie();
      const account = await fetch(url + "/account", {
        headers: { cookie: originalSession },
        redirect: "manual",
      });
      assert.equal(account.status, 200);
      assert.ok((await account.text()).includes("Test Member"));
      assert.equal(
        (await fetch(url + "/account", { redirect: "manual" })).status,
        307,
      );
    },
  );
  await t.test(
    "verified recovery grant, password replacement and session revocation",
    async () => {
      const replacement = {
        email,
        password: nextPassword,
        confirmPassword: nextPassword,
      };
      assert.equal(
        (await request(route + "password", replacement)).status,
        403,
      );
      assert.equal(
        (await request(route + "request", { email, purpose: "recover" }))
          .status,
        200,
      );
      const code = await getCode(email);
      assert.equal((await verify("recover", code)).status, 200);
      const grantCookie = cookie();
      assert.equal(
        (await request(route + "password", replacement)).status,
        200,
      );
      assert.equal(
        (
          await request(route + "password", replacement, {
            cookie: grantCookie,
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await fetch(url + "/account", {
            headers: { cookie: originalSession },
            redirect: "manual",
          })
        ).status,
        307,
      );
      assert.equal((await login(password)).status, 401);
      let signedIn = await login(nextPassword);
      if (signedIn.status === 429) {
        // Better Auth limits bursts of real sign-in calls, including this fast test.
        const seconds = Number(
          signedIn.headers.get("x-retry-after") ??
            signedIn.headers.get("retry-after"),
        );
        assert.ok(
          seconds >= 0 && seconds <= 15,
          "Expected a short sign-in cooldown",
        );
        await delay((seconds + 1) * 1000);
        signedIn = await login(nextPassword);
      }
      assert.equal(signedIn.status, 200);
      assert.equal((await request("/api/auth/sign-out", {})).status, 200);
      assert.equal(
        (
          await fetch(url + "/account", {
            headers: { cookie: cookie() },
            redirect: "manual",
          })
        ).status,
        307,
      );
    },
  );
  await t.test("OTP expiry, resend and invalid attempt limit", async () => {
    const address = "limits@example.test";
    assert.equal(
      (await request(route + "request", { ...signup, email: address })).status,
      200,
    );
    const first = await getCode(address);
    const collection = db.collection("otp_verifications");
    await collection.updateOne(
      { email: address },
      { $set: { expiresAt: new Date(0), sentAt: new Date(0) } },
    );
    assert.equal((await verify("register", first, address)).status, 400);
    assert.equal(
      (
        await request(route + "request", {
          email: address,
          purpose: "register",
          resend: true,
        })
      ).status,
      200,
    );
    const second = await getCode(address);
    const wrong = second === "000000" ? "000001" : "000000";
    for (let i = 0; i < 5; i++)
      assert.equal((await verify("register", wrong, address)).status, 400);
    assert.equal((await verify("register", second, address)).status, 400);
    assert.equal((await collection.findOne({ email: address })).attempts, 5);
  });
  await t.test(
    "generic account responses, origin checks and closed alternate routes",
    async () => {
      const existing = await reg();
      const absent = await request(route + "request", {
        email: "absent@example.test",
        purpose: "recover",
      });
      assert.equal(existing.status, 200);
      assert.equal(absent.status, 200);
      assert.deepEqual(await existing.json(), await absent.json());
      assert.equal(
        (
          await request(route + "request", signup, {
            origin: "https://other.example",
          })
        ).status,
        403,
      );
      for (const endpoint of [
        "request-password-reset",
        "reset-password",
        "sign-up/email",
      ]) {
        assert.equal((await request("/api/auth/" + endpoint, {})).status, 404);
      }
    },
  );
  await t.test(
    "Google authorization redirect, state and cancellation",
    async () => {
      const result = await request("/api/auth/sign-in/social", {
        provider: "google",
      });
      assert.equal(result.status, 200);
      const redirect = new URL((await result.json()).url);
      assert.equal(redirect.hostname, "accounts.google.com");
      assert.ok(redirect.searchParams.get("state"));
      assert.equal(
        redirect.searchParams.get("redirect_uri"),
        url + "/api/auth/callback/google",
      );
      const cancelled = new URL(url + "/api/auth/callback/google");
      cancelled.searchParams.set("state", redirect.searchParams.get("state"));
      cancelled.searchParams.set("error", "access_denied");
      const response = await fetch(cancelled, {
        headers: { cookie: cookie() },
        redirect: "manual",
      });
      assert.ok([302, 303, 307].includes(response.status));
    },
  );
  await t.test("Google membership waits for the confirmed profile and issues one session", async()=>{
    jar.clear();
    const start=await request("/api/auth/sign-in/social",{provider:"google"});
    const state=new URL((await start.json()).url).searchParams.get("state");
    const callback=await fetch(url+"/api/auth/callback/google?code=fixture&state="+encodeURIComponent(state),{headers:{cookie:cookie()},redirect:"manual"});
    remember(callback);
    assert.match(callback.headers.get("location") || "", /club_profile_required/);
    assert.ok(jar.get("ec-google-profile"),"Expected a pending enrollment cookie");
    assert.equal(await db.collection("user").countDocuments({email:"google@example.test"}),0);
    const details={name:"Confirmed Name",confirmName:"Incorrect",phone:"9999999999"};
    assert.equal((await request("/api/auth/complete-profile",details)).status,400);
    const enrollment=cookie();
    details.confirmName=details.name;
    assert.equal((await request("/api/auth/complete-profile",details)).status,200);
    assert.equal((await request("/api/auth/complete-profile",details,{cookie:enrollment})).status,401);
    const user=await db.collection("user").findOne({email:"google@example.test"});
    assert.equal(user.phone,"+919999999999");assert.equal(user.name,details.name);
    assert.equal(await db.collection("account").countDocuments({userId:user._id,providerId:"google"}),1);
    const account=await fetch(url+"/account",{headers:{cookie:cookie()},redirect:"manual"});
    assert.equal(account.status,200);
  });
  const shared={};
  await t.test("private queries, administrator replies and the published notice board",async()=>{
    const question={subject:"Test bench hours",message:"When can I use the test bench?",email:"forged@example.test",phone:"00000000",reply:"ignored"};
    assert.equal((await request("/api/queries",question,{cookie:""})).status,401);
    assert.equal((await request("/api/queries",question)).status,201);
    const record=await db.collection("member_queries").findOne({subject:question.subject});
    assert.equal(record.email,"google@example.test");assert.equal(record.phone,"+919999999999");assert.equal(record.reply,undefined);
    const memberCookie=cookie();
    jar.clear();
    assert.equal((await login(nextPassword)).status,200);
    const adminCookie=cookie();
    const otherInbox=await fetch(url+"/queries",{headers:{cookie:adminCookie}});
    assert.ok(!(await otherInbox.text()).includes(question.message));

    // The admin panel is part of the site: guests sign in, non-admins get a 404, writes check the role.
    const adminUrl=url+"/admin";
    const guestAdmin=await fetch(adminUrl,{redirect:"manual"});
    assert.ok([303,307,308].includes(guestAdmin.status));
    assert.match(guestAdmin.headers.get("location")||"",/\/login\?next=%2Fadmin/);
    assert.equal((await fetch(adminUrl,{headers:{cookie:memberCookie}})).status,404,"Non-admins see a 404");
    const admin=(route,body,as=adminCookie,extra={})=>request("/api/admin/"+route,body,{cookie:as,...extra});
    const reply="The bench is open on Friday.";
    assert.equal((await admin("queries/"+record._id,{reply},memberCookie)).status,403);
    assert.equal((await admin("queries/"+record._id,{reply},adminCookie)).status,403,"Role is required before promotion");
    await db.collection("user").updateOne({email},{$set:{role:"admin"}});
    for(const page of ["","/events","/events/new","/registrations","/queries","/announcements","/members"])
      assert.equal((await fetch(adminUrl+page,{headers:{cookie:adminCookie}})).status,200,"Admin page "+page);
    assert.equal((await admin("queries/"+record._id,{reply},adminCookie,{origin:"https://elsewhere.example"})).status,403,"Cross-site writes are refused");
    assert.equal((await admin("queries/not-an-id",{reply})).status,404);
    assert.equal((await admin("queries/"+record._id,{reply,email:"replaced@example.test"})).status,200);
    const answered=await db.collection("member_queries").findOne({_id:record._id});
    assert.equal(answered.reply,reply);assert.equal(answered.email,record.email);assert.ok(answered.repliedAt);
    assert.ok((await(await fetch(url+"/queries",{headers:{cookie:memberCookie}})).text()).includes(reply));
    assert.ok((await(await fetch(adminUrl+"/queries?show=answered",{headers:{cookie:adminCookie}})).text()).includes(question.subject));

    const title="Workshop room update", message="Meet in the electronics lab.";
    assert.equal((await admin("announcements",{title,message:"",published:false})).status,400);
    const draft=await admin("announcements",{title,message,published:false});
    assert.equal(draft.status,201);
    const notice=await db.collection("announcements").findOne({title});
    assert.ok(notice);assert.equal(notice.published,false);assert.ok(!(await(await fetch(url)).text()).includes(title));
    const publish=await admin("announcements/"+notice._id,{title,message,published:true});
    assert.equal(publish.status,200);assert.ok((await(await fetch(url)).text()).includes(title));

    const self=await db.collection("user").findOne({email});
    const member=await db.collection("user").findOne({email:"google@example.test"});
    assert.equal((await admin("members/"+self._id,{role:"member"})).status,409,"Admins cannot remove their own access");
    assert.equal((await admin("members/"+member._id,{role:"owner"})).status,400);
    assert.equal((await admin("members/"+member._id,{role:"admin"})).status,200);
    assert.equal((await db.collection("user").findOne({_id:member._id})).role,"admin");
    assert.equal((await admin("members/"+member._id,{role:"member"})).status,200);
    assert.equal((await db.collection("user").findOne({_id:member._id})).role,"member");
    Object.assign(shared,{adminUrl,admin,memberCookie,adminCookie});
  });
  await t.test("event registration, seat limits and the administrator export",async()=>{
    const {adminUrl,admin,memberCookie,adminCookie}=shared;
    const solo={college:"IIT Guwahati",year:"2nd year"};
    const register=(slug,intent,as,details=solo)=>request("/api/events/"+slug+"/registration",{intent,...details},{cookie:as});
    const slug="soldering-lab", name="Soldering lab night";
    const fields={slug,name,summary:"Practise through-hole soldering.",registrationStatus:"open",published:true,capacity:"1",teamSize:"1",startsAt:"2026-12-05T18:30",registeredCount:"40"};
    assert.equal((await admin("events",{...fields,slug:"Bad Slug!"})).status,400);
    assert.equal((await admin("events",{...fields,capacity:"0"})).status,400);
    assert.equal((await admin("events",fields,memberCookie)).status,403);
    const created=await admin("events",fields);
    assert.equal(created.status,201);
    const event=await db.collection("events").findOne({slug});
    assert.ok(event);assert.equal(event.registeredCount,0,"Admin payload must not set the seat counter");
    assert.equal(event.startsAt.toISOString(),"2026-12-05T13:00:00.000Z","Start time is read as IST");
    assert.equal(String((await created.json()).id),String(event._id));
    assert.equal((await admin("events",fields)).status,409,"Slugs are unique");
    assert.equal((await fetch(adminUrl+"/events/"+event._id,{headers:{cookie:adminCookie}})).status,200);
    const renamed=await admin("events/"+event._id,{...fields,venue:"Electronics lab",registeredCount:"99"});
    assert.equal(renamed.status,200);
    const afterEdit=await db.collection("events").findOne({_id:event._id});
    assert.equal(afterEdit.venue,"Electronics lab");assert.equal(afterEdit.registeredCount,0);
    await admin("events/"+event._id,{...fields,venue:""});
    assert.equal((await db.collection("events").findOne({_id:event._id})).venue,undefined,"Cleared optional fields are removed");
    assert.ok((await(await fetch(url+"/events")).text()).includes(name));
    const page=await fetch(url+"/events/"+slug,{headers:{cookie:memberCookie}});
    assert.equal(page.status,200);assert.ok((await page.text()).includes("Register now"));
    assert.equal((await fetch(url+"/events/not-an-event")).status,404);

    assert.equal((await register(slug,"register","")).status,401);
    assert.equal((await register(slug,"register",memberCookie,{college:"IIT Guwahati",year:"Sophomore"})).status,400);
    assert.equal((await register(slug,"register",memberCookie)).status,200);
    assert.equal((await register(slug,"register",memberCookie)).status,200,"Registering twice is idempotent");
    assert.equal(await db.collection("event_registrations").countDocuments({event:event._id,status:"registered"}),1);
    assert.equal((await db.collection("events").findOne({slug})).registeredCount,1);
    const full=await register(slug,"register",adminCookie);
    assert.equal(full.status,409);assert.match((await full.json()).error,/full/);
    assert.ok((await(await fetch(url+"/account",{headers:{cookie:memberCookie}})).text()).includes(name));

    assert.equal((await register(slug,"cancel",memberCookie)).status,200);
    assert.equal((await db.collection("events").findOne({slug})).registeredCount,0);
    assert.equal((await register(slug,"register",adminCookie)).status,200);
    await db.collection("event_registrations").updateOne({event:event._id,status:"registered"},{$set:{name:"=HYPERLINK(\"x\")"}});

    const csv=await fetch(adminUrl+"/export/registrations.csv?event="+event._id,{headers:{cookie:adminCookie}});
    assert.equal(csv.status,200);assert.match(csv.headers.get("content-type"),/^text\/csv/);
    const sheet=await csv.text();
    assert.ok(sheet.includes(email)&&sheet.includes(name));
    assert.ok(sheet.includes("\"'=HYPERLINK(\"\"x\"\")\""),"Formula-like cells are exported as text");
    assert.ok(!sheet.includes("google@example.test"),"Cancelled registrations are excluded by default");
    assert.equal((await fetch(adminUrl+"/export/registrations.csv",{headers:{cookie:memberCookie}})).status,403);
    assert.equal((await fetch(adminUrl+"/export/registrations.csv?event=nope",{headers:{cookie:adminCookie}})).status,400);
    const listing=await(await fetch(adminUrl+"/registrations?event="+event._id,{headers:{cookie:adminCookie}})).text();
    assert.ok(listing.includes(email)&&!listing.includes("google@example.test"));
    assert.ok((await(await fetch(adminUrl+"/registrations?status=all",{headers:{cookie:adminCookie}})).text()).includes("google@example.test"));

    await db.collection("events").updateOne({slug},{$set:{registrationStatus:"closed"}});
    assert.equal((await register(slug,"cancel",adminCookie)).status,409);
    await db.collection("events").updateOne({slug},{$set:{published:false}});
    assert.equal((await register(slug,"register",memberCookie)).status,404);
    assert.equal((await fetch(url+"/events/"+slug)).status,404);
  });
  await t.test("Embedded 101 is seeded and its team form requires sign-in",async()=>{
    const {adminUrl,memberCookie,adminCookie}=shared;
    const seeded=await db.collection("events").findOne({slug:"embedded-101"});
    assert.ok(seeded,"Embedded 101 is created on first connection");
    assert.equal(seeded.teamSize,3);assert.equal(seeded.registrationStatus,"open");
    const form="/events/embedded-101/register";
    const guest=await fetch(url+form,{redirect:"manual"});
    assert.ok([303,307,308].includes(guest.status));
    assert.match(guest.headers.get("location")||"",/\/login\?next=%2Fevents%2Fembedded-101%2Fregister/);
    const login=await fetch(url+"/login?next="+encodeURIComponent(form));
    assert.ok((await login.text()).includes(form),"Sign-in returns to the form");
    const page=await fetch(url+form,{headers:{cookie:memberCookie}});
    assert.equal(page.status,200);assert.ok((await page.text()).includes("Teammate 2 email"));

    const send=(as,details)=>request("/api/events/embedded-101/registration",{intent:"register",college:"IIT Guwahati",year:"3rd year",...details},{cookie:as});
    const team={teamName:"Bit Bangers",teammates:[{name:"Ria Das",email:"ria@example.test"},{name:"Kabir Paul",email:"kabir@example.test"}]};
    assert.equal((await send(memberCookie,{})).status,400,"Team events need a team");
    assert.equal((await send(memberCookie,{...team,teammates:team.teammates.slice(0,1)})).status,400);
    const dup=await send(memberCookie,{...team,teammates:[team.teammates[0],{name:"Me",email:"google@example.test"}]});
    assert.equal(dup.status,400);assert.match((await dup.json()).error,/different email/);
    const ok=await send(memberCookie,team);
    assert.equal(ok.status,200);assert.equal((await ok.json()).status,"registered");
    const edited=await send(memberCookie,{...team,teamName:"Bit Bangers 2"});
    assert.equal((await edited.json()).status,"updated");
    const saved=await db.collection("event_registrations").findOne({event:seeded._id});
    assert.equal(saved.details.teamName,"Bit Bangers 2");assert.equal(saved.details.teammates.length,2);
    assert.equal((await db.collection("events").findOne({_id:seeded._id})).registeredCount,1,"Editing keeps one seat");
    assert.ok((await(await fetch(url+"/account",{headers:{cookie:memberCookie}})).text()).includes("Bit Bangers 2"));
    const sheet=await(await fetch(adminUrl+"/export/registrations.csv?event="+seeded._id,{headers:{cookie:adminCookie}})).text();
    assert.ok(sheet.includes("Bit Bangers 2")&&sheet.includes("ria@example.test"));
  });
  await t.test("team and projects come from the database with Cloudinary images",async()=>{
    const {admin,memberCookie}=shared;
    assert.equal(await db.collection("team_members").countDocuments(),11,"The 2026–27 heads are seeded once");
    assert.equal(await db.collection("projects").countDocuments(),3);
    const team=await(await fetch(url+"/team")).text();
    assert.ok(team.includes("Mourya")&&team.includes("Signal Processing Head")&&team.includes("Princy"));
    assert.ok((await(await fetch(url+"/projects")).text()).includes("Signal display"));
    assert.equal((await fetch(url+"/projects/battery-monitor")).status,200);

    const photo="https://res.cloudinary.com/club-demo/image/upload/v1712345678/team/rhea.jpg";
    const person={name:"Rhea",role:"Robotics Head",bio:"Builds things that move.",image:photo,order:"20",published:true,tenure:"2026–27"};
    assert.equal((await admin("team",person,memberCookie)).status,403);
    assert.equal((await admin("team",{...person,image:"https://example.com/rhea.jpg"})).status,400,"Only Cloudinary URLs are accepted");
    const added=await admin("team",person);
    assert.equal(added.status,201);
    const id=(await added.json()).id;
    const withPhoto=await(await fetch(url+"/team")).text();
    assert.ok(withPhoto.includes("https://res.cloudinary.com/club-demo/image/upload/c_fill,g_face,w_160,h_160,f_auto,q_auto/v1712345678/team/rhea.jpg"));
    assert.equal((await admin("team/"+id,{...person,image:"",published:false})).status,200);
    const hidden=await db.collection("team_members").findOne({name:"Rhea"});
    assert.equal(hidden.image,undefined);assert.equal(hidden.published,false);
    assert.ok(!(await(await fetch(url+"/team")).text()).includes("Robotics Head"));
    assert.equal((await admin("team/"+id,{intent:"delete"})).status,200);
    assert.equal(await db.collection("team_members").countDocuments({name:"Rhea"}),0);

    const project={slug:"line-follower",title:"Line follower",description:"A robot that tracks a black line.",category:"ROBOTICS",
      image:"https://res.cloudinary.com/club-demo/image/upload/v1/projects/line.png",order:"5",published:true};
    const made=await admin("projects",project);
    assert.equal(made.status,201);
    assert.equal((await admin("projects",project)).status,409,"Project slugs are unique");
    const page=await fetch(url+"/projects/line-follower");
    assert.equal(page.status,200);assert.ok((await page.text()).includes("c_fill,g_auto,w_720,h_478"));
    assert.equal((await admin("projects/"+(await made.json()).id,{intent:"delete"})).status,200);
    assert.equal((await fetch(url+"/projects/line-follower")).status,404);
    for(const p of ["/team","/projects"])
      assert.equal((await fetch(url+"/admin"+p,{headers:{cookie:shared.adminCookie}})).status,200);
  });
});
