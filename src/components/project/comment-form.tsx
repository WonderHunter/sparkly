"use client";

import { useActionState, useEffect, useRef } from "react";
import { Flag } from "lucide-react";
import { addComment, report, type ActionState } from "@/app/p/[slug]/actions";
import { Button } from "@/components/ui/button";
import { FormMessage, Textarea } from "@/components/ui/form";
import { submitKeepingValues } from "@/lib/keep-form-values";

interface CommentFormProps {
  slug: string;
  projectId: string;
  postId?: string;
  parentId?: string;
  compact?: boolean;
}

export function CommentForm({ slug, projectId, postId, parentId, compact = false }: CommentFormProps) {
  const [state, action, pending] = useActionState<ActionState, FormData>(addComment.bind(null, slug), {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  const id = `comment-${parentId ?? postId ?? "root"}`;
  return (
    <form ref={formRef} action={action} onSubmit={submitKeepingValues(action)} className="space-y-3">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="postId" value={postId ?? ""} />
      <input type="hidden" name="parentId" value={parentId ?? ""} />
      <label htmlFor={id} className="sr-only">
        {parentId ? "Ta réponse" : "Ton commentaire"}
      </label>
      <Textarea
        id={id}
        name="body"
        maxLength={2000}
        required
        placeholder={parentId ? "Écris une réponse…" : "Un retour, une question, un encouragement…"}
        className={compact ? "min-h-20" : undefined}
      />
      {state.error && <FormMessage>{state.error}</FormMessage>}
      <div className="flex justify-end">
        <Button type="submit" size={compact ? "sm" : "md"} disabled={pending}>
          {pending ? "Envoi…" : parentId ? "Répondre" : "Publier"}
        </Button>
      </div>
    </form>
  );
}

export function ReportButton({ targetType, targetId }: { targetType: "project" | "post" | "comment"; targetId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(report, {});
  if (state.ok) return <span className="text-success">{state.message}</span>;

  return (
    <details className="relative">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 hover:text-foreground [&::-webkit-details-marker]:hidden">
        <Flag className="h-3.5 w-3.5" /> Signaler
      </summary>
      <form action={action} onSubmit={submitKeepingValues(action)} className="absolute left-0 z-10 mt-2 w-72 space-y-2 rounded-xl border border-border bg-surface p-3 font-normal shadow-lg">
        <input type="hidden" name="targetType" value={targetType} />
        <input type="hidden" name="targetId" value={targetId} />
        <label htmlFor={`report-${targetId}`} className="block text-xs font-semibold text-foreground">
          Pourquoi signaler ce contenu ?
        </label>
        <Textarea id={`report-${targetId}`} name="reason" required minLength={3} maxLength={500} className="min-h-16 text-sm" />
        {state.error && <p className="text-xs text-danger">{state.error}</p>}
        <Button type="submit" size="sm" variant="danger" disabled={pending}>
          Envoyer
        </Button>
      </form>
    </details>
  );
}
