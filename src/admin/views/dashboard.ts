import { db, fn } from "../lib/api.js";
import { h, icon } from "../lib/dom.js";
import { can, publish, publishNow, state } from "../lib/state.js";
import { ago, badge, empty, ENQ_STATUS, errorState, money, refNo, skeleton } from "../lib/ui.js";
import { pageHead } from "./shell.js";

const stat = (label: string, value: string | number, href?: string, tone = "") =>
  h(href ? "a" : "div", { class: `stat${tone ? ` stat--${tone}` : ""}`, ...(href ? { href } : {}) } as any, h("span", { class: "stat__label mono" }, label), h("span", { class: "stat__value" }, String(value)));

export async function dashboardView(): Promise<HTMLElement> {
  const root = h("div", { class: "page" });
  const first = state.profile?.full_name?.split(" ")[0] || "there";
  root.append(
    pageHead(
      `Hello, ${first}`,
      "Here's what's happening with the website.",
      can.admin() ? h("a", { class: "btn", href: "/admin/enquiries/" }, icon("inbox"), "Client queries") : null,
      h("a", { class: "btn btn--primary", href: "/admin/projects/new/" }, icon("plus"), "New project")
    )
  );
  const stats = h("div", { class: "stats" }, skeleton(2));
  const cols = h("div", { class: "cols" });
  root.append(stats, cols);

  const load = async () => {
    try {
      const s = await db.rpc<Record<string, number>>("dashboard_stats");
      stats.replaceChildren(
        ...(can.admin()
          ? [
              stat("Unread enquiries", s.enquiries_unread, "/admin/enquiries/?unread=1", s.enquiries_unread ? "orange" : ""),
              stat("Open enquiries", s.enquiries_open, "/admin/enquiries/"),
              stat("Follow-ups due", s.follow_ups_due, "/admin/enquiries/?due=1", s.follow_ups_due ? "red" : ""),
              stat("Pipeline value", money(s.pipeline_value)),
              stat("Enquiries · 30 days", s.enquiries_30d),
              stat("Converted", s.converted),
            ]
          : []),
        stat("Live projects", s.projects_published, "/admin/projects/"),
        stat("Live apps", s.apps_live, "/admin/apps/"),
        stat("Drafts", s.projects_draft, "/admin/projects/?status=draft"),
        stat("Media files", s.media, "/admin/media/")
      );
    } catch (err) {
      stats.replaceChildren(errorState(err, load));
    }

    const panels: HTMLElement[] = [];
    if (can.admin()) {
      const box = h("section", { class: "card" }, h("div", { class: "card__head" }, h("h2", { class: "card__title" }, "Latest enquiries"), h("a", { class: "linkbtn", href: "/admin/enquiries/" }, "View all")), skeleton(4));
      panels.push(box);
      db.select("enquiries", "select=id,ref,name,company,service,status,is_read,created_at&archived=is.false&status=neq.spam&order=created_at.desc&limit=6")
        .then(({ data }) => {
          box.lastElementChild!.replaceWith(
            data.length
              ? h(
                  "ul",
                  { class: "mini" },
                  data.map((e: any) =>
                    h(
                      "li",
                      null,
                      h(
                        "a",
                        { class: `mini__row${e.is_read ? "" : " is-unread"}`, href: `/admin/enquiries/${e.id}/` },
                        h("span", { class: "mini__main" }, h("b", null, e.name), h("small", null, [refNo(e.ref), e.company, e.service].filter(Boolean).join(" · "))),
                        badge(ENQ_STATUS[e.status]?.label ?? e.status, ENQ_STATUS[e.status]?.tone),
                        h("span", { class: "mini__time mono" }, ago(e.created_at))
                      )
                    )
                  )
                )
              : empty("No enquiries yet", "Briefs sent from the website's contact form will appear here.")
          );
        })
        .catch((err) => box.lastElementChild!.replaceWith(errorState(err)));

      const act = h("section", { class: "card" }, h("div", { class: "card__head" }, h("h2", { class: "card__title" }, "Recent activity"), h("a", { class: "linkbtn", href: "/admin/activity/" }, "View all")), skeleton(4));
      panels.push(act);
      db.select("activity_logs", "select=actor_email,action,resource_type,resource_label,created_at&order=id.desc&limit=8")
        .then(({ data }) => {
          act.lastElementChild!.replaceWith(
            data.length
              ? h("ul", { class: "mini" }, data.map((a: any) => h("li", { class: "mini__row" }, h("span", { class: "mini__main" }, h("b", null, `${a.action} · ${a.resource_label ?? a.resource_type}`), h("small", null, `${a.actor_email || "system"} · ${a.resource_type.replace(/_/g, " ")}`)), h("span", { class: "mini__time mono" }, ago(a.created_at)))))
              : empty("Nothing yet", "Changes made in the admin are listed here.")
          );
        })
        .catch((err) => act.lastElementChild!.replaceWith(errorState(err)));
    }

    const pubCard = h("section", { class: "card" }, h("h2", { class: "card__title" }, "Website"), skeleton(2));
    panels.push(pubCard);
    fn<{ configured: boolean; last: { requested_at?: string; by?: string } }>("rebuild")
      .then((r) => {
        pubCard.lastElementChild!.replaceWith(
          h(
            "div",
            { class: "stack" },
            h("p", null, r.configured ? (publish.dirty ? "You have changes that aren't on the live site yet." : "The live site is up to date with your last publish.") : "Automatic publishing isn't set up yet (DEPLOY_HOOK_URL). Content is saved; the site updates on the next deploy."),
            r.last?.requested_at ? h("p", { class: "muted" }, `Last published ${ago(r.last.requested_at)} by ${r.last.by ?? "—"}`) : null,
            h("div", { class: "row" }, h("button", { class: "btn btn--primary", type: "button", disabled: !r.configured, onclick: () => publishNow() }, icon("publish"), "Publish website"), h("a", { class: "btn", href: "/", target: "_blank", rel: "noopener" }, icon("external"), "View website"))
          )
        );
      })
      .catch((err) => pubCard.lastElementChild!.replaceWith(h("p", { class: "muted" }, (err as Error).message)));

    cols.replaceChildren(...panels);
  };
  load();
  return root;
}
