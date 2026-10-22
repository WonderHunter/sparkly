import { isEmptyRichText } from "./sanitize";

export interface PublishInput {
  pitch: string;
  story: string;
  cover_url: string | null;
  video_url: string | null;
}

export interface PublishItem {
  key: "pitch" | "story" | "visual" | "team";
  label: string;
  /** Onglet de l'éditeur où compléter ce point. */
  tab: "basics" | "story" | "team";
  done: boolean;
  required: boolean;
}

/** Ce qu'il faut pour publier un projet (obligatoire) et ce qui est conseillé. */
export function publishChecklist(project: PublishInput, membersCount: number): PublishItem[] {
  return [
    { key: "pitch", label: "Une phrase d'accroche", tab: "basics", done: project.pitch.trim().length > 0, required: true },
    { key: "story", label: "Une description du jeu", tab: "story", done: !isEmptyRichText(project.story), required: true },
    {
      key: "visual",
      label: "Un visuel de couverture ou une vidéo",
      tab: "basics",
      done: Boolean(project.cover_url || project.video_url),
      required: false,
    },
    { key: "team", label: "Toute l'équipe a rejoint le projet", tab: "team", done: membersCount > 1, required: false },
  ];
}

/** Points obligatoires encore manquants : vide quand le projet peut être publié. */
export function missingForPublish(project: PublishInput): PublishItem[] {
  return publishChecklist(project, 0).filter((item) => item.required && !item.done);
}
