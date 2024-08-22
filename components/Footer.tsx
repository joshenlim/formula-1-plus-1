export default function Footer() {
  return (
    <footer className="w-full border-t border-t-foreground/10 px-8 py-4 flex justify-center text-center text-xs">
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
    </footer>
  );
}
