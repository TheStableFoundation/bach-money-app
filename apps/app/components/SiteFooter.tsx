/** Shared footer links, used on the landing page and the vault page. */
export function SiteFooter({ className = "" }: { className?: string }) {
  return (
    <footer
      className={`flex flex-wrap gap-6 border-t border-border pt-6 text-sm text-muted ${className}`}
    >
      <a
        className="hover:text-ink"
        href="https://docs.bach.money"
        target="_blank"
        rel="noopener noreferrer"
      >
        Docs
      </a>
      <a
        className="hover:text-ink"
        href="https://stats.bach.money"
        target="_blank"
        rel="noopener noreferrer"
      >
        Stats
      </a>
      <a
        className="hover:text-ink"
        href="https://bach.money"
        target="_blank"
        rel="noopener noreferrer"
      >
        bach.money →
      </a>
    </footer>
  );
}
