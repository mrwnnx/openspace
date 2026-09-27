import { redirect } from "next/navigation";
import { mesDroits } from "@/lib/droits";
import { accueilPour } from "@/lib/droits-domaines";

export default async function Home() {
  // /leads pour qui les voit ; sinon la première page que ses droits ouvrent.
  redirect(accueilPour((await mesDroits()).niveaux));
}
