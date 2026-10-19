"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
import { Input } from "@/components/ui/form";
import { slugify } from "@/lib/domain/slug";
import { useFieldError } from "./action-form";

/** Adresse du projet, avec aperçu de l'URL finale pendant la saisie. */
export function SlugField({ defaultValue, siteUrl }: { defaultValue: string; siteUrl: string }) {
  const [value, setValue] = useState(defaultValue);
  const error = useFieldError("slug");
  const preview = slugify(value);
  const host = siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <div className="space-y-1.5">
      <label htmlFor="slug" className="block text-sm font-semibold">
        Adresse du projet
      </label>
      <div className="flex items-stretch overflow-hidden rounded-xl border border-border bg-surface focus-within:border-spark focus-within:ring-3 focus-within:ring-spark/15">
        <span className="flex items-center gap-1.5 border-r border-border bg-surface-muted px-3 text-sm whitespace-nowrap text-muted">
          <Link2 className="h-4 w-4" aria-hidden /> {host}/p/
        </span>
        <Input
          id="slug"
          name="slug"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={60}
          required
          aria-invalid={Boolean(error)}
          aria-describedby="slug-hint"
          className="h-11 rounded-none border-0 focus:ring-0"
        />
      </div>
      {error ? (
        <p id="slug-error" role="alert" className="text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : (
        <p id="slug-hint" className="text-[13px] text-muted">
          {preview && preview !== value ? (
            <>
              Sera enregistrée comme <strong className="text-foreground">{preview}</strong>.{" "}
            </>
          ) : null}
          Les anciens liens continueront de fonctionner après un changement.
        </p>
      )}
    </div>
  );
}
