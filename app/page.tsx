import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-6 text-center dark:bg-black">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Family OS
      </h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        Le socle du projet est en place. Les prochaines phases ajouteront les
        foyers, les objectifs nutritionnels, les recettes, le planning et les
        listes de courses.
      </p>
      <Button>Ça fonctionne</Button>
    </div>
  );
}
