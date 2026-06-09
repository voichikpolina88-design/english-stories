import { BookOpen, House } from "lucide-react";

type AppHeaderProps = {
  view: "home" | "lesson";
  onHome: () => void;
};

export function AppHeader({ view, onHome }: AppHeaderProps) {
  return (
    <header className="app-header">
      <button className="logo-button" type="button" onClick={onHome} aria-label="English Stories home">
        <span className="logo-mark">
          <BookOpen size={22} aria-hidden="true" />
        </span>
        <span>English Stories</span>
      </button>

      <nav className="top-nav" aria-label="Main navigation">
        <button className={view === "home" ? "active" : ""} type="button" onClick={onHome}>
          <House size={18} aria-hidden="true" />
          Home
        </button>
        <button className={view === "lesson" ? "active" : ""} type="button">
          <BookOpen size={18} aria-hidden="true" />
          Learn
        </button>
      </nav>
    </header>
  );
}
