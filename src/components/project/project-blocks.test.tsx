import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Member, Milestone, ProjectCard as ProjectCardData } from "@/lib/types";
import { PlanningTimeline } from "./planning-timeline";
import { ProgressPanel } from "./progress-panel";
import { ProjectCard } from "./project-card";
import { TeamGrid } from "./team-grid";

function milestone(partial: Partial<Milestone>): Milestone {
  return {
    id: crypto.randomUUID(),
    project_id: "p",
    title: "Jalon",
    description: "",
    weight: 10,
    status: "todo",
    period_label: "",
    starts_on: null,
    ends_on: null,
    position: 0,
    completed_at: null,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    ...partial,
  };
}

describe("ProgressPanel", () => {
  const now = new Date("2026-11-16T12:00:00Z");

  it("affiche les deux jauges du gabarit et la date de fin", () => {
    render(<ProgressPanel progress={38} startsOn="2026-09-01" endsOn="2027-01-31" now={now} />);
    expect(screen.getByRole("progressbar", { name: "Avancée du projet" })).toHaveAttribute("aria-valuenow", "38");
    expect(screen.getByRole("progressbar", { name: "Timeline du projet" })).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByText(/Le projet se termine le/)).toHaveTextContent("31 janvier 2027");
    expect(screen.getByText("76")).toBeInTheDocument(); // jours restants
  });

  it("signale un projet en retard sur le temps écoulé", () => {
    render(<ProgressPanel progress={10} startsOn="2026-09-01" endsOn="2027-01-31" now={now} />);
    expect(screen.getByText("En retard")).toBeInTheDocument();
  });

  it("signale un projet en avance", () => {
    render(<ProgressPanel progress={90} startsOn="2026-09-01" endsOn="2027-01-31" now={now} />);
    expect(screen.getByText("En avance")).toBeInTheDocument();
  });
});

describe("PlanningTimeline", () => {
  it("liste les jalons avec leur période et leur statut", () => {
    render(
      <PlanningTimeline
        milestones={[
          milestone({ title: "Conception", period_label: "Septembre", status: "done" }),
          milestone({ title: "Prototypage", period_label: "Octobre", status: "in_progress" }),
          milestone({ title: "Tests", period_label: "Décembre" }),
        ]}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(within(items[0]).getByText("Terminé")).toBeInTheDocument();
    expect(within(items[1]).getByText("En cours")).toBeInTheDocument();
    expect(within(items[2]).getByText("À faire")).toBeInTheDocument();
    expect(within(items[1]).getByText("Octobre")).toBeInTheDocument();
  });

  it("affiche un message quand le planning est vide", () => {
    render(<PlanningTimeline milestones={[]} />);
    expect(screen.getByText(/pas encore été défini/)).toBeInTheDocument();
  });
});

describe("TeamGrid", () => {
  const members: Member[] = [
    {
      user_id: "1",
      role: "owner",
      team_title: "Lead dev",
      position: 0,
      profile: { id: "1", username: "alice", display_name: "Alice Martin", avatar_url: null, role: "student" },
    },
    {
      user_id: "2",
      role: "crea",
      team_title: "",
      position: 1,
      profile: { id: "2", username: "chloe", display_name: "Chloé Durand", avatar_url: null, role: "student" },
    },
  ];

  it("affiche photo (ou initiales), nom et rôle de chaque membre", () => {
    render(<TeamGrid members={members} />);
    expect(screen.getByRole("link", { name: /Alice Martin/ })).toHaveAttribute("href", "/u/alice");
    expect(screen.getByText("Lead dev")).toBeInTheDocument();
    // Sans rôle personnalisé, on affiche le profil (créa / com).
    expect(screen.getByText("Créa / Com")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Chloé Durand" })).toHaveTextContent("CD");
  });
});

describe("ProjectCard", () => {
  const card: ProjectCardData = {
    id: "p1",
    slug: "neon-pusher",
    title: "Neon Pusher",
    pitch: "Un coin pusher néon.",
    logo_url: null,
    cover_url: null,
    platform: "borne",
    status: "published",
    progress: 42,
    starts_on: "2026-09-01",
    ends_on: "2027-01-31",
    published_at: "2026-10-01T00:00:00Z",
    created_at: "2026-09-02T00:00:00Z",
    updated_at: "2026-10-10T00:00:00Z",
    category_id: 1,
    category_slug: "casino",
    category_name: "Casino",
    fts: null,
    members_count: 3,
    followers_count: 2,
    comments_count: 5,
    posts_count: 4,
    last_post_at: null,
    funded_amount: 4500,
    backers_count: 2,
    character_id: 2,
    character_slug: "aimant",
    character_name: "Un aimant",
    emotion_id: 10,
    emotion_slug: "defoulement",
    emotion_name: "Défoulement",
  };

  it("montre le titre, l'accroche, l'avancée et les compteurs", () => {
    render(<ProjectCard project={card} goal={10000} />);
    expect(screen.getByRole("link", { name: "Neon Pusher" })).toHaveAttribute("href", "/p/neon-pusher");
    expect(screen.getByText("Un coin pusher néon.")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Avancée de Neon Pusher" })).toHaveAttribute("aria-valuenow", "42");
    expect(screen.getByText("Borne d'arcade")).toBeInTheDocument();
    expect(screen.getByText("Casino")).toBeInTheDocument();
    expect(screen.getByText("3 membres")).toBeInTheDocument();
    expect(screen.getByText("4 devlogs")).toBeInTheDocument();
    // Financement : 4 500 € sur 10 000 €
    expect(screen.getByRole("progressbar", { name: "Financement de Neon Pusher" })).toHaveAttribute("aria-valuenow", "45");
    expect(screen.getByText(/financés · 45 %/)).toBeInTheDocument();
  });
});
