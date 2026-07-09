import { cn } from "@/lib/utils";
import { SVGAttributes, ReactNode } from "react";

export type IconProps = SVGAttributes<SVGSVGElement> & {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
};

const sizes = {
  xs: "h-3.5 w-3.5",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-7 w-7",
};

function Icon({
  size = "md",
  className,
  children,
  viewBox = "0 0 24 24",
  fill = "none",
  stroke = "currentColor",
  strokeWidth = 2,
  ...props
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox={viewBox}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(sizes[size], className)}
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconHome(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z" />
    </Icon>
  );
}

export function IconWallet(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </Icon>
  );
}

export function IconChart(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 19V5M12 19V9M20 19v-6" />
    </Icon>
  );
}

export function IconTrendUp(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M16 7h6v6" />
      <path d="m22 7-8.5 8.5-5-5L2 17" />
    </Icon>
  );
}

export function IconCalendar(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </Icon>
  );
}

export function IconReceipt(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 2h12v20l-2-1.5L14 22l-2-1.5L10 22 8 20.5 6 22Z" />
      <path d="M9 7h6M9 11h6M9 15h4" />
    </Icon>
  );
}

export function IconTarget(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
    </Icon>
  );
}

export function IconCreditCard(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </Icon>
  );
}

export function IconPiggyBank(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M11 17h3a2 2 0 0 0 2-2v-1a2 2 0 0 1 2-2h1" />
      <path d="M19 12V9a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" />
      <path d="M16 14h.01" />
      <circle cx="9" cy="11" r="1" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </Icon>
  );
}

export function IconUser(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" />
    </Icon>
  );
}

export function IconBell(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </Icon>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Icon>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 6 9 17l-5-5" />
    </Icon>
  );
}

export function IconX(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </Icon>
  );
}

export function IconPencil(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Icon>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6M14 11v6" />
    </Icon>
  );
}

export function IconInfo(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6M12 7h.01" />
    </Icon>
  );
}

export function IconAlertTriangle(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3 2 21h20L12 3Z" />
      <path d="M12 10v4M12 17h.01" />
    </Icon>
  );
}

export function IconAlertCircle(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4M12 16h.01" />
    </Icon>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m6 9 6 6 6-6" />
    </Icon>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m9 6 6 6-6 6" />
    </Icon>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Icon>
  );
}

export function IconLogout(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </Icon>
  );
}

export function IconComponents(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3 2 8l10 5 10-5-10-5Zm0 7 10-5v10l-10 5L2 15V5l10 5Z" />
    </Icon>
  );
}

export function IconFood(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 11h18M5 11V7a2 2 0 0 1 2-2h2v6M11 5h2v6M17 5h2a2 2 0 0 1 2 2v4" />
    </Icon>
  );
}

export function IconTransport(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14 16H9" />
      <path d="M19 16h1a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.684-.948l-1.684-.473A1 1 0 0 1 17 10.28V8a1 1 0 0 0-1-1h-3.28a1 1 0 0 1-.948-.684L10.5 4.5A1 1 0 0 0 9.632 4H6a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h1" />
      <circle cx="7.5" cy="16.5" r="1.5" />
      <circle cx="16.5" cy="16.5" r="1.5" />
    </Icon>
  );
}

export function IconCar(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M19 17h2c.6 0 1-.4 1-1v-3.28a1 1 0 0 0-.684-.948l-1.684-.473A1 1 0 0 1 17 10.28V8a1 1 0 0 0-1-1h-3.28a1 1 0 0 1-.948-.684L10.5 4.5A1 1 0 0 0 9.632 4H6a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h1" />
      <circle cx="7.5" cy="17.5" r="1.5" />
      <circle cx="16.5" cy="17.5" r="1.5" />
    </Icon>
  );
}

export function IconFuel(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 22V8a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v14" />
      <path d="M3 10h10" />
      <path d="M13 10V6a2 2 0 0 1 2-2h1l3 4v12h-6" />
    </Icon>
  );
}

export function IconBank(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 10h18M5 10V20M9 10V20M15 10V20M19 10V20M2 20h20M12 3 2 10h20L12 3Z" />
    </Icon>
  );
}

export function IconCoins(props: IconProps) {
  return (
    <Icon {...props}>
      <ellipse cx="9" cy="9" rx="5" ry="2.5" />
      <path d="M4 9v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V9M4 13v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-4" />
    </Icon>
  );
}

export function IconExchange(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m8 3-4 4 4 4" />
      <path d="M4 7h16" />
      <path d="m16 21 4-4-4-4" />
      <path d="M20 17H4" />
    </Icon>
  );
}

export function IconShopping(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </Icon>
  );
}

export function IconBuilding(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M9 7h.01M9 11h.01M9 15h.01M15 7h.01M15 11h.01M15 15h.01" />
    </Icon>
  );
}

export function IconHealth(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.5-7 10-7 10Z" />
    </Icon>
  );
}

export function IconEducation(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3 2 8l10 5 10-5-10-5Z" />
      <path d="M6 10v5c0 2 2.7 3 6 3s6-1 6-3v-5" />
    </Icon>
  );
}

export function IconSubscription(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 9h10M7 13h6" />
    </Icon>
  );
}

export function IconTransfer(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m3 8 4-4 4 4" />
      <path d="M7 4v16" />
      <path d="m21 16-4 4-4-4" />
      <path d="M17 20V4" />
    </Icon>
  );
}

export function IconTag(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m9 5 8 8-4 4-8-8V5h4Z" />
      <circle cx="11" cy="9" r="1" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function IconTrendDown(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M16 17h6v-6" />
      <path d="m22 17-8.5-8.5-5 5L2 7" />
    </Icon>
  );
}

export function IconDownload(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
    </Icon>
  );
}

export function IconFilter(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </Icon>
  );
}

export function IconPercent(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="7.5" cy="7.5" r="2.5" />
      <circle cx="16.5" cy="16.5" r="2.5" />
      <path d="M19 5 5 19" />
    </Icon>
  );
}

export function IconShield(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3z" />
    </Icon>
  );
}

export function IconParking(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M10 8h3a2.5 2.5 0 0 1 0 5h-3V8z" />
    </Icon>
  );
}

export function IconPlane(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
    </Icon>
  );
}

export function IconGift(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="10" width="18" height="11" rx="1" />
      <path d="M12 10V21M3 14h18M12 10c-2-2-4-3-4-5a2 2 0 0 1 4 0c0-2 2-3 4-5a2 2 0 0 1 0 4c-2 2-4 3-4 5z" />
    </Icon>
  );
}

export function IconSalary(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18M8 14h2" />
    </Icon>
  );
}

export function IconBill(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 4h9l5 5v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
      <path d="M14 4v5h5M8 13h8M8 17h5" />
    </Icon>
  );
}

export function IconLoan(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3v18M7 8l5-5 5 5M7 16l5 5 5-5" />
    </Icon>
  );
}

export function IconInvest(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 19V9M10 19V5M16 19v-7M22 19V3" />
    </Icon>
  );
}

export function IconCash(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6 12h.01M18 12h.01" />
    </Icon>
  );
}

export function IconAtm(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M7 8h10M7 12h4M7 16h6" />
    </Icon>
  );
}

export function IconRepair(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </Icon>
  );
}

export function IconWrench(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </Icon>
  );
}

export function IconBarChart(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 3v18h18" />
      <path d="M7 16v-5M12 16V8M17 16v-9" />
    </Icon>
  );
}

export function IconBitcoin(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M11.5 2v2M11.5 20v2M15.5 6.5c1 .8 1.5 2 1.5 3.5 0 2.5-2 4-4.5 4.5M8.5 6.5C7.5 7.3 7 8.5 7 10c0 2.5 2 4 4.5 4.5M8 14h6a2 2 0 0 0 0-4H9a2 2 0 0 1 0-4h5" />
    </Icon>
  );
}

export function IconDollarSign(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </Icon>
  );
}

export function IconLayoutDashboard(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </Icon>
  );
}

export function IconRepeat(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </Icon>
  );
}

export function IconHouse(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 12 12 3l9 9" />
      <path d="M5 10v10a1 1 0 0 0 1 1h4v-5h4v5h4a1 1 0 0 0 1-1V10" />
    </Icon>
  );
}

export function IconBaby(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="5" r="3" />
      <path d="M5 22v-3a7 7 0 0 1 14 0v3" />
      <path d="M9 13l3 3 3-3" />
    </Icon>
  );
}

export function IconPaw(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="6" r="1.5" />
      <circle cx="12" cy="4" r="1.5" />
      <circle cx="16" cy="6" r="1.5" />
      <circle cx="18.5" cy="10" r="1.5" />
      <path d="M12 10c-3 0-5.5 2-5.5 5a3.5 3.5 0 0 0 7 0c0 .5.5 1 1 1s1-.5 1-1a3.5 3.5 0 0 0-3.5-5z" />
    </Icon>
  );
}

export function IconDumbbell(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2" y="10" width="4" height="4" rx="1" />
      <rect x="18" y="10" width="4" height="4" rx="1" />
      <rect x="4" y="8" width="3" height="8" rx="1" />
      <rect x="17" y="8" width="3" height="8" rx="1" />
      <path d="M7 12h10" />
    </Icon>
  );
}

export function IconRing(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="14" r="5" />
      <path d="M9 9V7a3 3 0 0 1 6 0v2" />
      <path d="M10 14h4" />
    </Icon>
  );
}

export function IconSmartphone(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <circle cx="12" cy="17" r="1" />
      <path d="M9 6h6" />
    </Icon>
  );
}

export function IconStar(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </Icon>
  );
}

export function IconMotorcycle(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="5.5" cy="17.5" r="3" />
      <circle cx="18.5" cy="17.5" r="3" />
      <path d="M15 5h-4l-1.5 3H8L6.5 11 8 14.5h3M15 5l1.5 3-2 3.5H10" />
      <path d="M19 9h-4l-1 3" />
    </Icon>
  );
}

export function IconBicycle(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="5" cy="16" r="3" />
      <circle cx="19" cy="16" r="3" />
      <path d="M12 4h2l3 8H7l2-6h2" />
      <path d="M12 4v4M5 16l7-8 7 8" />
    </Icon>
  );
}

export const icons = {
  home: IconHome,
  wallet: IconWallet,
  chart: IconChart,
  trendUp: IconTrendUp,
  trendDown: IconTrendDown,
  calendar: IconCalendar,
  receipt: IconReceipt,
  target: IconTarget,
  creditCard: IconCreditCard,
  piggyBank: IconPiggyBank,
  settings: IconSettings,
  user: IconUser,
  bell: IconBell,
  search: IconSearch,
  plus: IconPlus,
  check: IconCheck,
  x: IconX,
  pencil: IconPencil,
  trash: IconTrash,
  info: IconInfo,
  alertTriangle: IconAlertTriangle,
  alertCircle: IconAlertCircle,
  chevronDown: IconChevronDown,
  chevronRight: IconChevronRight,
  menu: IconMenu,
  logout: IconLogout,
  components: IconComponents,
  food: IconFood,
  transport: IconTransport,
  car: IconCar,
  fuel: IconFuel,
  bank: IconBank,
  coins: IconCoins,
  exchange: IconExchange,
  shopping: IconShopping,
  building: IconBuilding,
  health: IconHealth,
  education: IconEducation,
  subscription: IconSubscription,
  transfer: IconTransfer,
  tag: IconTag,
  download: IconDownload,
  filter: IconFilter,
  percent: IconPercent,
  shield: IconShield,
  parking: IconParking,
  plane: IconPlane,
  gift: IconGift,
  salary: IconSalary,
  bill: IconBill,
  loan: IconLoan,
  invest: IconInvest,
  cash: IconCash,
  atm: IconAtm,
  repair: IconRepair,
  bitcoin: IconBitcoin,
  dollarSign: IconDollarSign,
  layoutDashboard: IconLayoutDashboard,
  repeat: IconRepeat,
  house: IconHouse,
  baby: IconBaby,
  paw: IconPaw,
  dumbbell: IconDumbbell,
  ring: IconRing,
  smartphone: IconSmartphone,
  star: IconStar,
  motorcycle: IconMotorcycle,
  bicycle: IconBicycle,
} as const;

export type IconCategoryKey =
  | "incomeExpense"
  | "goals"
  | "consumption"
  | "savings"
  | "general";

export const iconCategories: ReadonlyArray<{
  categoryKey: IconCategoryKey;
  keys: readonly (keyof typeof icons)[];
}> = [
  {
    categoryKey: "incomeExpense",
    keys: [
      "receipt",
      "salary",
      "transfer",
      "exchange",
      "bill",
      "loan",
      "invest",
      "repeat",
      "trendUp",
      "trendDown",
      "target",
    ],
  },
  {
    categoryKey: "goals",
    keys: [
      "star",
      "house",
      "car",
      "motorcycle",
      "bicycle",
      "plane",
      "ring",
      "baby",
      "paw",
      "dumbbell",
      "smartphone",
      "gift",
    ],
  },
  {
    categoryKey: "consumption",
    keys: [
      "food",
      "shopping",
      "transport",
      "fuel",
      "parking",
      "health",
      "education",
      "subscription",
      "tag",
    ],
  },
  {
    categoryKey: "savings",
    keys: [
      "wallet",
      "creditCard",
      "bank",
      "cash",
      "coins",
      "piggyBank",
      "percent",
      "atm",
      "dollarSign",
      "bitcoin",
    ],
  },
  {
    categoryKey: "general",
    keys: [
      "chart",
      "calendar",
      "building",
      "home",
      "shield",
      "plus",
      "check",
      "x",
      "pencil",
      "trash",
      "info",
      "alertTriangle",
      "alertCircle",
      "download",
      "filter",
      "repair",
      "search",
      "settings",
      "user",
      "bell",
    ],
  },
] as const;

export function getIconCategoryLabel(categoryKey: IconCategoryKey, t: (key: string) => string) {
  return t(`ui.iconPicker.categories.${categoryKey}`);
}
