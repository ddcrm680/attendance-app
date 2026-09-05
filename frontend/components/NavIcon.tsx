type IconName =
  | "home"
  | "attendance"
  | "leave"
  | "calendar"
  | "wfh"
  | "privacy"
  | "dashboard"
  | "employees"
  | "departments"
  | "offices"
  | "live"
  | "whatsapp"
  | "audit"
  | "logout";
const paths: Record<IconName, string> = {
  home: "M3 10.5 12 3l9 7.5v9a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z",
  attendance:
    "M7 3v4m10-4v4M4 9h16M5 5h14a1 1 0 0 1 1 1v13H4V6a1 1 0 0 1 1-1Zm3 8h2m2 0h2m-6 3h2m2 0h2",
  leave:
    "M5 5h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm3-2v4m8-4v4M4 9h16",
  calendar: "M6 3v4m12-4v4M4 9h16M5 5h14a1 1 0 0 1 1 1v13H4V6a1 1 0 0 1 1-1",
  wfh: "M3 10h18M5 10V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3m-1 0v8H6v-8m4 4h4",
  privacy: "M12 3 20 6v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z",
  dashboard: "M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z",
  employees:
    "M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m7-9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm5-7a3 3 0 0 1 0 6m3 7v-1a3 3 0 0 0-2-2.8",
  departments: "M4 5h16v14H4zM8 5v14M4 10h16",
  offices: "M4 21V4h16v17M8 8h2m4 0h2M8 12h2m4 0h2M8 16h2m4 0h2",
  live: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v5l3 2",
  whatsapp: "M20 11.5a8 8 0 0 1-12.7 6.5L4 19l1-3.3A8 8 0 1 1 20 11.5Z",
  audit: "M5 4h14v16H5zM8 8h8M8 12h8M8 16h5",
  logout: "M10 17l5-5-5-5m5 5H3m11-8V3h6v18h-6v-4",
};
export default function NavIcon({ name }: { name: IconName }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
    >
      <path d={paths[name]} />
    </svg>
  );
}
