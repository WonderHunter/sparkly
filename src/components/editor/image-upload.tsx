"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { ACCEPTED_IMAGE_TYPES, compressImage } from "@/lib/images";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface UploadOptions {
  bucket: "avatars" | "project-media";
  /** Premier dossier du chemin : id du projet ou de l'utilisateur (contrôlé par la RLS du stockage). */
  folder: string;
  maxSize?: number;
}

export async function uploadImage(file: File, { bucket, folder, maxSize }: UploadOptions): Promise<string> {
  const blob = await compressImage(file, maxSize);
  const ext = blob.type === "image/gif" ? "gif" : "webp";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const supabase = createClient();
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: blob.type,
    cacheControl: "31536000",
  });
  if (error) throw new Error("L'envoi de l'image a échoué. Réessaie avec une image plus légère.");
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

interface ImageFieldProps extends UploadOptions {
  name: string;
  label: string;
  defaultValue?: string | null;
  aspect?: "video" | "square";
  hint?: string;
}

/** Champ image : aperçu, envoi compressé, URL stockée dans un input caché. */
export function ImageField({ name, label, defaultValue, aspect = "video", hint, ...options }: ImageFieldProps) {
  const id = useId();
  const [url, setUrl] = useState(defaultValue ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      setUrl(await uploadImage(file, options));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-semibold">{label}</span>
      <input type="hidden" name={name} value={url} />
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border-2 border-dashed border-border bg-surface-muted",
          aspect === "video" ? "aspect-video" : "aspect-square w-32",
        )}
      >
        {url ? (
          <>
            <Image src={url} alt="" fill sizes="600px" className="object-cover" />
            <button
              type="button"
              onClick={() => setUrl("")}
              className="absolute top-2 right-2 rounded-full bg-ink/80 p-1.5 text-white hover:bg-ink"
              aria-label={`Retirer l'image : ${label}`}
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <label htmlFor={id} className="flex h-full cursor-pointer flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted hover:text-foreground">
            {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
            {busy ? "Envoi…" : "Choisir une image"}
          </label>
        )}
        <input id={id} type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} className="sr-only" onChange={onChange} disabled={busy} />
      </div>
      {url && (
        <label htmlFor={id} className="inline-block cursor-pointer text-sm font-semibold text-spark-strong hover:underline">
          Remplacer
        </label>
      )}
      {hint && !error && <p className="text-[13px] text-muted">{hint}</p>}
      {error && <p className="text-[13px] font-medium text-danger" role="alert">{error}</p>}
    </div>
  );
}

/** Galerie d'images (devlog) : jusqu'à `max` images. */
export function GalleryField({ name, defaultValue = [], max = 8, ...options }: UploadOptions & { name: string; defaultValue?: string[]; max?: number }) {
  const id = useId();
  const [urls, setUrls] = useState<string[]>(defaultValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, max - urls.length);
    e.target.value = "";
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of files) uploaded.push(await uploadImage(file, options));
      setUrls((prev) => [...prev, ...uploaded].slice(0, max));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <span className="block text-sm font-semibold">Images ({urls.length}/{max})</span>
      {urls.map((u) => (
        <input key={u} type="hidden" name={name} value={u} />
      ))}
      <div className="flex flex-wrap gap-3">
        {urls.map((u) => (
          <div key={u} className="relative h-24 w-36 overflow-hidden rounded-xl bg-surface-muted">
            <Image src={u} alt="" fill sizes="144px" className="object-cover" />
            <button
              type="button"
              onClick={() => setUrls((prev) => prev.filter((x) => x !== u))}
              className="absolute top-1 right-1 rounded-full bg-ink/80 p-1 text-white"
              aria-label="Retirer cette image"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {urls.length < max && (
          <label
            htmlFor={id}
            className="flex h-24 w-36 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-xs text-muted hover:text-foreground"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
            {busy ? "Envoi…" : "Ajouter"}
          </label>
        )}
        <input id={id} type="file" multiple accept={ACCEPTED_IMAGE_TYPES.join(",")} className="sr-only" onChange={onChange} disabled={busy} />
      </div>
      {error && <p className="text-[13px] font-medium text-danger" role="alert">{error}</p>}
    </div>
  );
}
