"use client";

import { useState, useTransition } from "react";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ConfirmDeleteButton({
  itemLabel,
  description,
  ariaLabel,
  onConfirm,
  onSuccess,
}: {
  /** Utilisé dans le titre de la popup ("Supprimer {itemLabel} ?"). */
  itemLabel: string;
  description?: string;
  ariaLabel?: string;
  onConfirm: () => Promise<{ error: string | null } | void>;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await onConfirm();
      if (result?.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      onSuccess?.();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label={ariaLabel ?? `Supprimer ${itemLabel}`}
            className="text-muted-foreground hover:border-destructive hover:text-destructive flex size-6 shrink-0 items-center justify-center rounded-full border"
          />
        }
      >
        <XIcon className="size-3.5" />
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Supprimer {itemLabel} ?</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Annuler
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={handleConfirm}
          >
            {pending ? "Suppression..." : "Supprimer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
