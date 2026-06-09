import { BookOpen, Home } from "lucide-react";

type HeaderProps = {
  currentView: "home" | "story";
  onHome: () => void;
  onStories: () => void;
};

export function Header({ currentView, onHome, onStories }: HeaderProps) {
  return (
    <header className="site-header">
      <button className="brand-button" type="button" onClick={onHome} aria-label="Go to home page">
        <span className="brand-mark">
          <BookOpen size={22} aria-hidden="true" />
        </span>
        <span>English Stories</span>
      </button>

      <nav className="nav-links" aria-label="Main navigation">
        <button className={currentView === "home" ? "active" : ""} type="button" onClick={onHome}>
          <Home size={17} aria-hidden="true" />
          Home
        </button>
        <button className={currentView === "story" ? "active" : ""} type="button" onClick={onStories}>
          <BookOpen size={17} aria-hidden="true" />
          Stories
        </button>
      </nav>
    </header>
  );
}
