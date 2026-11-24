import { toIstInput } from "@/lib/admin";

type EventValues = {
  slug?: string;
  name?: string;
  summary?: string;
  description?: string | null;
  venue?: string | null;
  startsAt?: Date | null;
  capacity?: number | null;
  teamSize?: number | null;
  registrationStatus?: string | null;
  published?: boolean | null;
};
export function EventFields({ event = {} }: { event?: EventValues }) {
  return (
    <>
      <fieldset>
        <legend>Basics</legend>
        <div className="form-row">
          <label className="field">Event name<input name="name" required maxLength={120} defaultValue={event.name ?? ""} /></label>
          <label className="field">
            URL slug
            <input name="slug" required maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={event.slug ?? ""} placeholder="soldering-workshop" />
          </label>
        </div>
        <label className="field">Summary<textarea name="summary" required maxLength={240} rows={2} defaultValue={event.summary ?? ""} /></label>
        <label className="field">Description<textarea name="description" maxLength={5000} rows={5} defaultValue={event.description ?? ""} /></label>
      </fieldset>
      <fieldset>
        <legend>Schedule and seats</legend>
        <div className="form-row">
          <label className="field">Starts (IST)<input type="datetime-local" name="startsAt" defaultValue={toIstInput(event.startsAt)} /></label>
          <label className="field">Venue<input name="venue" maxLength={120} defaultValue={event.venue ?? ""} placeholder="Online, or a room on campus" /></label>
          <label className="field">Capacity<input type="number" name="capacity" min={1} defaultValue={event.capacity ?? ""} placeholder="No limit" /></label>
          <label className="field">
            Team size
            <input type="number" name="teamSize" min={1} max={6} defaultValue={event.teamSize ?? 1} />
          </label>
        </div>
        <p className="form-hint">With a team size above 1, the form asks for a team name and each teammate’s name and email.</p>
      </fieldset>
      <fieldset>
        <legend>Visibility</legend>
        <div className="form-row">
          <label className="field">
            Registration
            <select name="registrationStatus" defaultValue={event.registrationStatus ?? "planned"}>
              <option value="planned">Opens soon</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </label>
          <label className="check align-end">
            <input type="checkbox" name="published" defaultChecked={!!event.published} /> Published on the website
          </label>
        </div>
      </fieldset>
    </>
  );
}
