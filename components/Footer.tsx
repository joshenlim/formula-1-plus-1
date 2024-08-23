import { Github } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full border-t border-t-foreground/10 px-8 py-4 flex justify-center text-center text-xs space-x-4">
      <p>
        Powered by{" "}
        <a
          target="_blank"
          rel="noreferrer"
          className="font-bold hover:underline"
          href="https://supabase.com/?utm_source=create-next-app&utm_medium=template&utm_term=nextjs"
        >
          Supabase
        </a>
      </p>
      <a
        target="_blank"
        rel="noreferrer"
        href="https://github.com/joshenlim/formula-1-plus-1"
      >
        <Github size={16} />
      </a>
    </footer>
  );
}
