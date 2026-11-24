"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function MemberForm({mode,name="",phone="",editing=false,next="/account"}:{mode:"google"|"profile"|"query";name?:string;phone?:string;editing?:boolean;next?:string}){
  const router=useRouter();
  const [busy,setBusy]=useState(false), [message,setMessage]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const form=event.currentTarget;
    const fields=Object.fromEntries(new FormData(form));
    if(mode!=="query" && String(fields.name).trim()!==String(fields.confirmName).trim()){
      setMessage("The two names must match.");return;
    }
    setBusy(true);setMessage("");
    try {
      const path=mode==="google"?"/api/auth/complete-profile":mode==="profile"?"/api/profile":"/api/queries";
      const response=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(fields)});
      if(!response.ok){const body=await response.json();throw new Error(body.error || body.message || "Please try again.");}
      if(mode==="query"){form.reset();setMessage("Your query was sent. You can read the reply here.");router.refresh();}
      else window.location.assign(next);
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to submit. Please try again.");}
    finally{setBusy(false);}
  }
  return <form onSubmit={submit} aria-busy={busy} className="member-form">
    {mode==="query"?<>
      <label className="field">Subject<input name="subject" required maxLength={120}/></label>
      <label className="field">Your question<textarea name="message" rows={5} required maxLength={2000}/></label>
    </>:<>
      <label className="field">Full name<input name="name" defaultValue={name} required autoComplete="name" maxLength={120}/></label>
      <label className="field">Confirm full name<input name="confirmName" defaultValue={editing?name:""} required autoComplete="off" maxLength={120}/></label>
      <label className="field">Mobile number<input type="tel" name="phone" defaultValue={phone} autoComplete="tel" required maxLength={24} placeholder="+91 98765 43210"/></label>
    </>}
    {message && <p className="feedback" role="status">{message}</p>}
    <button className="button primary" disabled={busy}>{busy?"Submitting…":mode==="query"?"Send query":mode==="google"?"Create account":editing?"Save changes":"Save profile"}</button>
  </form>;
}

