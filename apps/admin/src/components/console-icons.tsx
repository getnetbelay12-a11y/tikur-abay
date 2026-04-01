import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function IconBase({
  size = 18,
  strokeWidth = 1.9,
  children,
  ...props
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return <IconBase {...props}><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></IconBase>;
}

export function SearchIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></IconBase>;
}

export function BellIcon(props: IconProps) {
  return <IconBase {...props}><path d="M6 9a6 6 0 1 1 12 0c0 6 2 7 2 7H4s2-1 2-7" /><path d="M10 20a2 2 0 0 0 4 0" /></IconBase>;
}

export function ChevronDownIcon(props: IconProps) {
  return <IconBase {...props}><path d="m6 9 6 6 6-6" /></IconBase>;
}

export function RefreshIcon(props: IconProps) {
  return <IconBase {...props}><path d="M21 12a9 9 0 0 1-15.5 6.36" /><path d="M3 12A9 9 0 0 1 18.5 5.64" /><path d="M3 17v-4h4" /><path d="M21 7v4h-4" /></IconBase>;
}

export function DownloadIcon(props: IconProps) {
  return <IconBase {...props}><path d="M12 4v10" /><path d="m8 10 4 4 4-4" /><path d="M4 20h16" /></IconBase>;
}

export function PanelLeftIcon(props: IconProps) {
  return <IconBase {...props}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></IconBase>;
}

export function LayoutDashboardIcon(props: IconProps) {
  return <IconBase {...props}><rect x="3" y="3" width="7" height="8" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="11" width="7" height="10" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></IconBase>;
}

export function RouteIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 18h4a4 4 0 0 0 4-4V8" /><path d="m14 8 4-4" /></IconBase>;
}

export function TruckIcon(props: IconProps) {
  return <IconBase {...props}><path d="M3 7h11v8H3z" /><path d="M14 10h3l3 3v2h-6z" /><circle cx="7.5" cy="18" r="1.5" /><circle cx="17.5" cy="18" r="1.5" /></IconBase>;
}

export function WrenchIcon(props: IconProps) {
  return <IconBase {...props}><path d="m14 7 3-3 3 3-3 3" /><path d="M17 7 7 17" /><path d="m5 19 2-2" /><path d="M4 15a4 4 0 0 0 5 5" /></IconBase>;
}

export function UsersIcon(props: IconProps) {
  return <IconBase {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></IconBase>;
}

export function BriefcaseIcon(props: IconProps) {
  return <IconBase {...props}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 12h18" /></IconBase>;
}

export function WalletIcon(props: IconProps) {
  return <IconBase {...props}><path d="M4 7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><path d="M15 12h5" /><circle cx="15" cy="12" r="1" /></IconBase>;
}

export function ShieldIcon(props: IconProps) {
  return <IconBase {...props}><path d="M12 3 5 6v6c0 5 3.5 8 7 9 3.5-1 7-4 7-9V6z" /><path d="m9.5 12 1.75 1.75L15 10" /></IconBase>;
}

export function MessageSquareIcon(props: IconProps) {
  return <IconBase {...props}><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></IconBase>;
}

export function SettingsIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-.33-1 1.65 1.65 0 0 0-1-.6 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1-.33H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1-.33 1.65 1.65 0 0 0 .6-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .33-1V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 .33 1 1.65 1.65 0 0 0 1 .6 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.27.3.46.65.6 1 .12.32.18.66.18 1s-.06.68-.18 1c-.14.35-.33.7-.6 1Z" /></IconBase>;
}

export function ActivityIcon(props: IconProps) {
  return <IconBase {...props}><path d="M3 12h4l2.5-6 5 12 2.5-6H21" /></IconBase>;
}

export function AlertTriangleIcon(props: IconProps) {
  return <IconBase {...props}><path d="M12 3 2.5 19h19z" /><path d="M12 9v4" /><path d="M12 17h.01" /></IconBase>;
}

export function DollarCircleIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="12" cy="12" r="9" /><path d="M14.5 9.5c0-1.1-1.12-2-2.5-2s-2.5.9-2.5 2 1.12 2 2.5 2 2.5.9 2.5 2-1.12 2-2.5 2-2.5-.9-2.5-2" /><path d="M12 6v12" /></IconBase>;
}

export function MapPinIcon(props: IconProps) {
  return <IconBase {...props}><path d="M12 21s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></IconBase>;
}

export function GaugeIcon(props: IconProps) {
  return <IconBase {...props}><path d="M12 14 17 9" /><path d="M20 13a8 8 0 1 0-16 0" /><path d="M6 18h12" /></IconBase>;
}

export function TrendingUpIcon(props: IconProps) {
  return <IconBase {...props}><path d="m3 17 6-6 4 4 7-7" /><path d="M14 8h6v6" /></IconBase>;
}

export function TrendingDownIcon(props: IconProps) {
  return <IconBase {...props}><path d="m3 7 6 6 4-4 7 7" /><path d="M14 16h6v-6" /></IconBase>;
}

export function ClockIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></IconBase>;
}

export function FileTextIcon(props: IconProps) {
  return <IconBase {...props}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6" /><path d="M9 17h6" /><path d="M9 9h2" /></IconBase>;
}

export function FuelIcon(props: IconProps) {
  return <IconBase {...props}><path d="M5 4h8v16H5z" /><path d="M13 7h2l3 3v7a2 2 0 0 1-2 2" /><path d="M8 8h2" /></IconBase>;
}

export function HandshakeIcon(props: IconProps) {
  return <IconBase {...props}><path d="m10 11 2 2a2 2 0 0 0 2.83 0l3.17-3.17a2 2 0 0 0 0-2.83l-.17-.17a2 2 0 0 0-2.83 0L12 9" /><path d="m14 13-2 2a2 2 0 0 1-2.83 0L6 11.83a2 2 0 0 1 0-2.83l.17-.17a2 2 0 0 1 2.83 0L12 11" /><path d="m4 8 2 2" /><path d="m18 14 2 2" /></IconBase>;
}

export function BuildingIcon(props: IconProps) {
  return <IconBase {...props}><path d="M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16" /><path d="M14 9h5a1 1 0 0 1 1 1v11" /><path d="M8 8h2" /><path d="M8 12h2" /><path d="M8 16h2" /><path d="M16 13h2" /><path d="M16 17h2" /><path d="M3 21h18" /></IconBase>;
}

export function ArrowRightIcon(props: IconProps) {
  return <IconBase {...props}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></IconBase>;
}

export function UserIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="12" cy="8" r="4" /><path d="M4 20a8 8 0 0 1 16 0" /></IconBase>;
}

export function GlobeIcon(props: IconProps) {
  return <IconBase {...props}><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14.5 14.5 0 0 1 0 18" /><path d="M12 3a14.5 14.5 0 0 0 0 18" /></IconBase>;
}
