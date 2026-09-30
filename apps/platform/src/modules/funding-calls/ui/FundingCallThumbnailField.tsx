"use client";

import { ImageIcon, Trash2 } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

import { GeneralButton } from "@/components/ui/button";
import { FileUploadButton } from "@/shared/ui/FileUploadButton";
import { fundingCallThumbnailMaximumBytes } from "../api/FundingCallSchemas";
import type { FundingCallView } from "../api/FundingCallTransport";
import { useFundingCallThumbnail } from "../FundingCallHooks";

const acceptedThumbnailTypes = ["image/jpeg", "image/png", "image/webp"];

export function FundingCallThumbnailField({
  call,
  disabled,
}: {
  call?: FundingCallView;
  disabled: boolean;
}) {
  const thumbnail = useFundingCallThumbnail(call?.id ?? "");
  const pending = thumbnail.upload.isPending || thumbnail.remove.isPending;

  async function upload(file: File) {
    if (!call) return;
    if (!acceptedThumbnailTypes.includes(file.type)) {
      toast.error("Choose a JPG, PNG, or WebP thumbnail.");
      return;
    }
    if (!file.size || file.size > fundingCallThumbnailMaximumBytes) {
      toast.error("Choose a non-empty thumbnail no larger than 2 MB.");
      return;
    }
    try {
      await thumbnail.upload.mutateAsync({
        expectedRowVersion: call.rowVersion,
        file,
      });
      toast.success("Funding call thumbnail updated.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to upload thumbnail.",
      );
    }
  }

  async function remove() {
    if (!call) return;
    try {
      await thumbnail.remove.mutateAsync(call.rowVersion);
      toast.success("Funding call thumbnail removed.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to remove thumbnail.",
      );
    }
  }

  return (
    <section className="grid gap-4 rounded-xl border border-brand-navy/10 bg-brand-cream/30 p-4 md:col-span-2 md:grid-cols-[12rem_minmax(0,1fr)]">
      <div className="relative grid aspect-video place-items-center overflow-hidden rounded-lg border border-brand-navy/10 bg-white">
        {call?.thumbnailUrl ? (
          <Image
            alt="Funding call thumbnail preview"
            className="object-cover"
            fill
            sizes="192px"
            src={call.thumbnailUrl}
            unoptimized
          />
        ) : (
          <ImageIcon aria-hidden="true" className="size-10 text-brand-navy/25" />
        )}
      </div>
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-bold text-brand-navy">Funding call thumbnail</h3>
          <p className="mt-1 text-xs leading-5 text-brand-navy/65">
            JPG, PNG, or WebP up to 2 MB. A 16:9 image of at least 1200 × 675 px is recommended.
          </p>
        </div>
        {call ? (
          <div className="flex flex-wrap gap-2">
            <FileUploadButton
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              className="min-w-64 flex-1"
              disabled={disabled}
              label={call.thumbnailUrl ? "Replace thumbnail" : "Upload thumbnail"}
              onFile={(file) => void upload(file)}
              uploading={pending}
              variant="compact"
            />
            {call.thumbnailUrl ? (
              <GeneralButton
                disabled={disabled || pending}
                onClick={() => void remove()}
                size="compact"
                type="button"
                variant="outline"
              >
                <Trash2 aria-hidden="true" className="size-4" />
                Remove
              </GeneralButton>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-brand-navy/60">
            Create the draft first, then upload its thumbnail from this step.
          </p>
        )}
      </div>
    </section>
  );
}
