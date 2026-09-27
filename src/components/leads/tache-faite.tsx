"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTaskStatusAction } from "@/app/actions";

// « Ma journée » : cocher une tâche sans quitter l'écran.
export function TacheFaite({ id }: { id: string }) {
  const router = useRouter();
  const [enCours, startTransition] = useTransition();
  return (
    <input
      type="checkbox"
      aria-label="Marquer comme faite"
      title="Marquer comme faite"
      disabled={enCours}
      onChange={() =>
        startTransition(async () => {
          await updateTaskStatusAction(id, "done");
          router.refresh();
        })
      }
      className="h-4 w-4 shrink-0 cursor-pointer accent-primary"
    />
  );
}
