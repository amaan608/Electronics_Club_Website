import type { registrationRows } from "@/lib/registration-export";

type Row = Awaited<ReturnType<typeof registrationRows>>[number];
export function RegistrationTable({ rows, showEvent = true }: { rows: Row[]; showEvent?: boolean }) {
  if (!rows.length) return <p className="empty-state">No registrations match.</p>;
  return (
    <div className="table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Member</th>
            {showEvent && <th>Event</th>}
            <th>College</th>
            <th>Team</th>
            <th>Registered</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <span className="item-title">{r.name}</span>
                <span className="item-meta"><a href={`mailto:${r.email}`}>{r.email}</a></span>
                <span className="item-meta">{r.phone}</span>
              </td>
              {showEvent && <td>{r.event}</td>}
              <td>
                {r.college || "—"}
                {r.year && <span className="item-meta">{r.year}</span>}
              </td>
              <td>
                {r.teamName ? <span className="item-title">{r.teamName}</span> : "—"}
                {r.teammates.map((m) => (
                  <span className="item-meta" key={m.email}>{m.name} · {m.email}</span>
                ))}
              </td>
              <td>
                {r.registeredAt.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}
              </td>
              <td><span className={r.status === "registered" ? "badge" : "badge muted"}>{r.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
