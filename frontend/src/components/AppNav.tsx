interface AppNavProps {
  active: string;
  onNavigate: (route: string) => void;
}

const NAV_ITEMS = [
  { label: "Dashboard", route: "/dashboard" },
  { label: "Insights", route: "/insights" },
  { label: "Science", route: "/science" },
  { label: "Diary", route: "/diary" },
  { label: "Profile", route: "/profile" }
];

export default function AppNav({ active, onNavigate }: AppNavProps) {
  return (
    <nav className="app-nav" aria-label="Primary">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.route}
          type="button"
          className={`app-nav__item ${active === item.route ? "app-nav__item--active" : ""}`}
          onClick={() => onNavigate(item.route)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
