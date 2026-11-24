// Where to send a member after sign-in. Only known same-site pages are accepted so
// a crafted ?next= value cannot redirect off the site.
const allowed = /^\/(?:account|queries|events\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/register)?|admin(?:\/[a-z0-9]+(?:-[a-z0-9]+)*){0,2})$/;
export function returnPath(value: unknown) {
  if (value === "queries") return "/queries";
  return typeof value === "string" && allowed.test(value) ? value : "/account";
}
