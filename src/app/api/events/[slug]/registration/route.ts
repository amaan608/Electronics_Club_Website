import { currentSession } from "@/lib/member-access";
import { failure, InputError, rateLimit, requestBody } from "@/lib/guards";
import { changeRegistration } from "@/lib/events";
import { eventSlug } from "@/lib/community-models";

export const runtime = "nodejs";
export async function POST(req: Request, ctx: RouteContext<"/api/events/[slug]/registration">) {
  try {
    const { slug } = await ctx.params;
    if (!eventSlug.test(slug)) throw new InputError("This event could not be found.", 404);
    const session = await currentSession();
    if (!session) throw new InputError("Sign in to register for this event.", 401);
    const { user } = session;
    if (!user.emailVerified || !user.phone)
      throw new InputError("Complete your member profile before registering.", 403);
    const data = await requestBody(req);
    const { intent } = data;
    if (intent !== "register" && intent !== "cancel") throw new InputError("Unknown registration action.");
    await rateLimit("event-registration:" + user.id, 20, 900);
    const status = await changeRegistration(slug, user, intent, data);
    return Response.json({ status }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return failure(error);
  }
}
