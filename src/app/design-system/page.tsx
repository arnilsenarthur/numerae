"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppLogo } from "@/components/brand/app-logo";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionGroup,
  AccordionItem,
  Alert,
  Badge,
  BarChart,
  Button,
  ButtonGroup,
  ButtonGroupItem,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Chart,
  Checkbox,
  Col,
  ColorPicker,
  ColumnChart,
  DataList,
  DataTable,
  type DataTableColumn,
  type ChartSeries,
  Dimmer,
  Grid,
  DatePicker,
  DateTimePicker,
  DonutChart,
  EmptyState,
  Field,
  icons,
  iconCategories,
  Input,
  LineChart,
  Loader,
  Modal,
  Money,
  MultiSelect,
  NumberInput,
  OtpInput,
  Progress,
  RadioGroup,
  Row,
  Sidebar,
  SidebarBrand,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarItem,
  SidebarNav,
  Select,
  Separator,
  Skeleton,
  Slider,
  Sparkline,
  Spinner,
  Stack,
  StackedProgress,
  StatCard,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  TimePicker,
  Tooltip,
  TooltipAnchor,
  HoverTooltip,
  Trend,
  fieldControlProps,
  getLengthFeedback,
  mergeFieldFeedback,
  useValidatedField,
  validationRules,
  useToast,
} from "@/components/ui";

type NavItem = { id: string; label: string };
type NavSection = NavItem & { items?: NavItem[] };
type NavGroup = { label: string; sections: NavSection[] };

const navGroups: NavGroup[] = [
  {
    label: "Fundamentos",
    sections: [
      { id: "buttons", label: "Buttons" },
      { id: "button-groups", label: "Button groups" },
      { id: "icons", label: "Icons" },
      { id: "badges", label: "Badges" },
    ],
  },
  {
    label: "Layout & dados",
    sections: [
      { id: "sidebar", label: "Sidebar" },
      { id: "cards", label: "Cards" },
      { id: "layout", label: "Layout" },
      { id: "dashboard", label: "Dashboard" },
      { id: "data", label: "Data & Tables" },
    ],
  },
  {
    label: "Visualização",
    sections: [
      {
        id: "charts",
        label: "Charts",
        items: [
          { id: "chart-animate", label: "Transição" },
          { id: "chart-sparkline", label: "Sparkline" },
          { id: "chart-bars", label: "Barras" },
          { id: "chart-donut", label: "Donut" },
          { id: "chart-columns", label: "Colunas" },
          { id: "chart-line", label: "Linha" },
        ],
      },
      { id: "progress", label: "Progress" },
    ],
  },
  {
    label: "Formulários",
    sections: [
      {
        id: "inputs",
        label: "Inputs",
        items: [
          { id: "input-states", label: "Estados" },
          { id: "input-form", label: "Formulário" },
          { id: "input-basic", label: "Básicos" },
        ],
      },
      { id: "pickers", label: "Date & Time" },
      { id: "otp", label: "OTP" },
      { id: "select", label: "Dropdown", items: [
          { id: "select-single", label: "Select" },
          { id: "select-multi", label: "MultiSelect" },
        ] },
      { id: "choices", label: "Checkbox & Radio" },
      { id: "accordion", label: "Accordion" },
      { id: "tabs", label: "Tabs" },
      { id: "slider", label: "Slider" },
      { id: "toggles", label: "Toggles" },
    ],
  },
  {
    label: "Feedback",
    sections: [
      { id: "loading", label: "Loader & Dimmer" },
      {
        id: "modal",
        label: "Modal",
        items: [
          { id: "modal-default", label: "Padrão" },
          { id: "modal-tones", label: "Tons" },
        ],
      },
      { id: "feedback", label: "Alerts & Toasts" },
    ],
  },
];

const sections = navGroups.flatMap((group) => group.sections);

const navIds = sections.flatMap((section) => [
  section.id,
  ...(section.items?.map((item) => item.id) ?? []),
]);

const childNavIds = new Set(
  sections.flatMap((section) => section.items?.map((item) => item.id) ?? []),
);

const categoryIcons = {
  food: (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 11h18M5 11V7a2 2 0 0 1 2-2h2v6M11 5h2v6M17 5h2a2 2 0 0 1 2 2v4" />
    </svg>
  ),
  transport: (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 16H9m10 0h1a1 1 0 0 0 1-1v-3.5a1 1 0 0 0-.8-.98L19 10l-2.7-3.6a1 1 0 0 0-.8-.4H8.5a1 1 0 0 0-.8.4L5 10l-1.2.52a1 1 0 0 0-.8.98V15a1 1 0 0 0 1 1h1" />
      <circle cx="7.5" cy="16.5" r="1.5" />
      <circle cx="16.5" cy="16.5" r="1.5" />
    </svg>
  ),
  housing: (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z" />
    </svg>
  ),
  leisure: (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  ),
};

const categoryOptions = [
  { value: "food", label: "Alimentação", icon: categoryIcons.food },
  { value: "transport", label: "Transporte", icon: categoryIcons.transport, description: "Uber, combustível, etc." },
  { value: "housing", label: "Moradia", icon: categoryIcons.housing },
  { value: "leisure", label: "Lazer", icon: categoryIcons.leisure },
];

const institutionOptions = [
  { value: "inst_wise", label: "Wise", description: "Spread ~0,4%" },
  { value: "inst_inter", label: "Banco Inter", description: "Conta global" },
  { value: "inst_btg", label: "BTG Pactual", description: "Private" },
  { value: "inst_avenue", label: "Avenue", description: "Investimentos EUA" },
  { value: "inst_nomad", label: "Nomad", description: "Conta USD" },
];

const budgetSegments = [
  { label: "Moradia", value: 35 },
  { label: "Alimentação", value: 22 },
  { label: "Transporte", value: 14 },
  { label: "Lazer", value: 12 },
  { label: "Outros", value: 17 },
];

const spendingBars = [
  { label: "Moradia", value: 82 },
  { label: "Alimentação", value: 64 },
  { label: "Transporte", value: 41 },
  { label: "Lazer", value: 28 },
];

const balanceTrend = [4200, 4350, 4100, 4480, 4520, 4280, 4610];

const weeklyBalance = [
  { label: "Seg", value: 4120 },
  { label: "Ter", value: 4280 },
  { label: "Qua", value: 4190 },
  { label: "Qui", value: 4410 },
  { label: "Sex", value: 4520 },
  { label: "Sáb", value: 4380 },
  { label: "Dom", value: 4610 },
];

const balanceTrendLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const chartPeriodData = {
  week: weeklyBalance,
  month: [
    { label: "Sem 1", value: 3920 },
    { label: "Sem 2", value: 4180 },
    { label: "Sem 3", value: 4450 },
    { label: "Sem 4", value: 4610 },
  ],
  year: [
    { label: "Jan", value: 2800 },
    { label: "Mar", value: 3200 },
    { label: "Mai", value: 3650 },
    { label: "Jul", value: 4100 },
    { label: "Set", value: 4380 },
    { label: "Nov", value: 4610 },
  ],
};

const balanceSeries: ChartSeries[] = [
  {
    id: "balance",
    label: "Saldo",
    strokeClassName: "stroke-emerald-500",
    data: weeklyBalance,
  },
  {
    id: "spending",
    label: "Gastos",
    strokeClassName: "stroke-rose-500",
    data: [
      { label: "Seg", value: 2100 },
      { label: "Ter", value: 1980 },
      { label: "Qua", value: 2250 },
      { label: "Qui", value: 2010 },
      { label: "Sex", value: 2340 },
      { label: "Sáb", value: 1890 },
      { label: "Dom", value: 1760 },
    ],
  },
];

const stackedSpendingBars = [
  {
    label: "Moradia",
    value: 82,
    segments: [
      { label: "Aluguel", value: 55 },
      { label: "Condomínio", value: 12 },
      { label: "IPTU", value: 15 },
    ],
  },
  {
    label: "Alimentação",
    value: 64,
    segments: [
      { label: "Mercado", value: 38 },
      { label: "Restaurantes", value: 26 },
    ],
  },
  {
    label: "Transporte",
    value: 41,
    segments: [
      { label: "Combustível", value: 22 },
      { label: "App", value: 19 },
    ],
  },
];

const stackedColumns = [
  {
    label: "Jan",
    value: 3200,
    segments: [
      { label: "Fixos", value: 1800 },
      { label: "Variáveis", value: 900 },
      { label: "Lazer", value: 500 },
    ],
  },
  {
    label: "Fev",
    value: 2900,
    segments: [
      { label: "Fixos", value: 1750 },
      { label: "Variáveis", value: 750 },
      { label: "Lazer", value: 400 },
    ],
  },
  {
    label: "Mar",
    value: 3400,
    segments: [
      { label: "Fixos", value: 1800 },
      { label: "Variáveis", value: 1100 },
      { label: "Lazer", value: 500 },
    ],
  },
];

const chartBarPeriodData = {
  week: stackedSpendingBars,
  month: [
    {
      label: "Moradia",
      value: 76,
      segments: [
        { label: "Aluguel", value: 50 },
        { label: "Condomínio", value: 14 },
        { label: "IPTU", value: 12 },
      ],
    },
    {
      label: "Alimentação",
      value: 58,
      segments: [
        { label: "Mercado", value: 34 },
        { label: "Restaurantes", value: 24 },
      ],
    },
    {
      label: "Transporte",
      value: 36,
      segments: [
        { label: "Combustível", value: 20 },
        { label: "App", value: 16 },
      ],
    },
  ],
  year: [
    {
      label: "T1",
      value: 68,
      segments: [
        { label: "Fixos", value: 42 },
        { label: "Variáveis", value: 26 },
      ],
    },
    {
      label: "T2",
      value: 74,
      segments: [
        { label: "Fixos", value: 44 },
        { label: "Variáveis", value: 30 },
      ],
    },
    {
      label: "T3",
      value: 81,
      segments: [
        { label: "Fixos", value: 48 },
        { label: "Variáveis", value: 33 },
      ],
    },
  ],
};

const chartColumnPeriodData = {
  week: [
    {
      label: "Seg",
      value: 820,
      segments: [
        { label: "Fixos", value: 480 },
        { label: "Variáveis", value: 240 },
        { label: "Lazer", value: 100 },
      ],
    },
    {
      label: "Qua",
      value: 760,
      segments: [
        { label: "Fixos", value: 450 },
        { label: "Variáveis", value: 210 },
        { label: "Lazer", value: 100 },
      ],
    },
    {
      label: "Sex",
      value: 910,
      segments: [
        { label: "Fixos", value: 500 },
        { label: "Variáveis", value: 280 },
        { label: "Lazer", value: 130 },
      ],
    },
  ],
  month: stackedColumns,
  year: [
    {
      label: "T1",
      value: 9200,
      segments: [
        { label: "Fixos", value: 5200 },
        { label: "Variáveis", value: 2800 },
        { label: "Lazer", value: 1200 },
      ],
    },
    {
      label: "T2",
      value: 9800,
      segments: [
        { label: "Fixos", value: 5400 },
        { label: "Variáveis", value: 3100 },
        { label: "Lazer", value: 1300 },
      ],
    },
    {
      label: "T3",
      value: 10400,
      segments: [
        { label: "Fixos", value: 5600 },
        { label: "Variáveis", value: 3300 },
        { label: "Lazer", value: 1500 },
      ],
    },
  ],
};

const chartDonutPeriodData = {
  week: budgetSegments,
  month: [
    { label: "Moradia", value: 38 },
    { label: "Alimentação", value: 24 },
    { label: "Transporte", value: 16 },
    { label: "Lazer", value: 10 },
    { label: "Outros", value: 12 },
  ],
  year: [
    { label: "Moradia", value: 32 },
    { label: "Alimentação", value: 26 },
    { label: "Transporte", value: 18 },
    { label: "Lazer", value: 14 },
    { label: "Outros", value: 10 },
  ],
};

const sampleTransactions = [
  { id: "1", date: "04/07", desc: "Supermercado", category: "Alimentação", amount: -142.8 },
  { id: "2", date: "03/07", desc: "Salário", category: "Renda", amount: 5200 },
  { id: "3", date: "02/07", desc: "Netflix", category: "Assinaturas", amount: -55.9 },
  { id: "4", date: "01/07", desc: "Uber", category: "Transporte", amount: -24.5 },
  { id: "5", date: "30/06", desc: "Posto Shell", category: "Transporte", amount: -180 },
  { id: "6", date: "29/06", desc: "Farmácia", category: "Saúde", amount: -67.4 },
  { id: "7", date: "28/06", desc: "Freelance", category: "Renda", amount: 850 },
  { id: "8", date: "27/06", desc: "Restaurante", category: "Alimentação", amount: -98.5 },
  { id: "9", date: "26/06", desc: "Spotify", category: "Assinaturas", amount: -34.9 },
];

const transactionColumns: DataTableColumn<(typeof sampleTransactions)[number]>[] = [
  {
    id: "date",
    header: "Data",
    sortable: true,
    sortValue: (row) => row.date,
    cell: (row) => <span className="text-zinc-500">{row.date}</span>,
  },
  {
    id: "desc",
    header: "Descrição",
    sortable: true,
    sortValue: (row) => row.desc,
    cell: (row) => <span className="font-medium">{row.desc}</span>,
  },
  {
    id: "category",
    header: "Categoria",
    sortable: true,
    sortValue: (row) => row.category,
    cell: (row) => <Badge variant="outline">{row.category}</Badge>,
  },
  {
    id: "amount",
    header: "Valor",
    align: "right",
    sortable: true,
    sortValue: (row) => row.amount,
    cell: (row) => <Money value={row.amount} showSign size="sm" />,
  },
];

export default function DesignSystemPage() {
  const { toast } = useToast();
  const [selectValue, setSelectValue] = useState("food");
  const [multiSelectValue, setMultiSelectValue] = useState<string[]>(["inst_wise", "inst_avenue"]);
  const [multiSelectEmpty, setMultiSelectEmpty] = useState<string[]>([]);
  const [sliderValue, setSliderValue] = useState(40);
  const [otpValue, setOtpValue] = useState("");
  const [notifications, setNotifications] = useState(true);
  const [dateValue, setDateValue] = useState("");
  const [timeValue, setTimeValue] = useState("");
  const [dateTimeValue, setDateTimeValue] = useState("");
  const [colorValue, setColorValue] = useState("#10B981");
  const [period, setPeriod] = useState("month");
  const [accountType, setAccountType] = useState("checking");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSuccessOpen, setModalSuccessOpen] = useState(false);
  const [modalErrorOpen, setModalErrorOpen] = useState(false);
  const [modalWarningOpen, setModalWarningOpen] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<"week" | "month" | "year">("week");
  const emailField = useValidatedField([validationRules.email()], {
    required: true,
    validateMode: "change",
    initialValue: "",
  });
  const amountField = useValidatedField([validationRules.currency()], {
    required: true,
    validateMode: ["blur", "submit"],
    successMessage: "Valor válido.",
    initialValue: "",
  });
  const [descriptionValue, setDescriptionValue] = useState("");
  const [descriptionTouched, setDescriptionTouched] = useState(false);
  const descriptionLength = useMemo(
    () => getLengthFeedback(descriptionValue, 60),
    [descriptionValue],
  );
  const descriptionValidation = useMemo(
    () =>
      mergeFieldFeedback(
        { state: "default", isValid: true, isEmpty: !descriptionValue.trim() },
        descriptionTouched || descriptionValue.length > 0 ? descriptionLength : null,
      ),
    [descriptionLength, descriptionTouched, descriptionValue],
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(navIds[0]);

  const expandedSectionId = sections.find(
    (section) =>
      section.items?.length &&
      (activeSection === section.id ||
        section.items.some((item) => item.id === activeSection)),
  )?.id;

  useEffect(() => {
    document.documentElement.classList.add("scroll-smooth");
    return () => document.documentElement.classList.remove("scroll-smooth");
  }, []);

  useEffect(() => {
    const visible = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.id;
          if (entry.isIntersecting) {
            visible.set(id, entry.intersectionRatio);
          } else {
            visible.delete(id);
          }
        });

        if (visible.size === 0) return;

        let bestId = "";
        let bestScore = -1;

        for (const [id, ratio] of visible) {
          const score = (childNavIds.has(id) ? 100 : 0) + ratio;
          if (score > bestScore) {
            bestScore = score;
            bestId = id;
          }
        }

        if (bestId) setActiveSection(bestId);
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      },
    );

    navIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black">
      <Dimmer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        className="lg:hidden"
      />

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 transition-transform duration-300 lg:translate-x-0",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <Sidebar className="h-screen" onNavigate={() => setMobileNavOpen(false)}>
          <SidebarHeader>
            <SidebarBrand
              href="/"
              logo={<AppLogo size={32} />}
              title="Numerae"
              subtitle="Design System"
            />
          </SidebarHeader>
          <SidebarNav>
            {navGroups.map((group) => (
              <SidebarGroup key={group.label} label={group.label}>
                {group.sections.map((section) => {
                  const childActive = section.items?.some(
                    (item) => activeSection === item.id,
                  );
                  const parentActive =
                    activeSection === section.id || Boolean(childActive);

                  return (
                    <SidebarItem
                      key={section.id}
                      href={`#${section.id}`}
                      active={parentActive}
                      expanded={expandedSectionId === section.id}
                      subItems={section.items?.map((item) => ({
                        href: `#${item.id}`,
                        label: item.label,
                        active: activeSection === item.id,
                      }))}
                    >
                      {section.label}
                    </SidebarItem>
                  );
                })}
              </SidebarGroup>
            ))}
          </SidebarNav>
          <SidebarFooter>
            <Link href="/dashboard" className="block">
              <Button variant="secondary" size="sm" className="w-full">
                Voltar ao app
              </Button>
            </Link>
          </SidebarFooter>
        </Sidebar>
      </div>

      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/85 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/85">
          <div className="flex items-center gap-3 px-4 py-4 sm:px-6">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="lg:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Abrir menu"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </Button>
            <div className="min-w-0 flex-1">
              <p className="text-[0.65rem] font-medium uppercase tracking-wider text-zinc-400">
                Numerae UI
              </p>
              <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Design System
              </h1>
            </div>
          </div>
        </header>

        <main className="space-y-12 px-4 py-8 sm:px-6">
          <section id="buttons" className="scroll-mt-24 space-y-4">
            <SectionHeader
              title="Buttons"
              description="Variantes e tamanhos com feedback visual."
            />
            <Card>
              <CardContent className="flex flex-wrap gap-3 pt-6">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
                <Button loading>Loading</Button>
                <Button size="sm">Small</Button>
                <Button size="lg">Large</Button>
              </CardContent>
            </Card>
          </section>

          <section id="button-groups" className="scroll-mt-24 space-y-4">
            <SectionHeader
              title="Button groups"
              description="Segmentos compactos — útil para filtros e alternância de período."
            />
            <Card>
              <CardContent className="space-y-4 pt-6">
                <ButtonGroup fullWidth className="sm:w-auto">
                  <ButtonGroupItem
                    active={period === "week"}
                    onClick={() => setPeriod("week")}
                  >
                    Semana
                  </ButtonGroupItem>
                  <ButtonGroupItem
                    active={period === "month"}
                    onClick={() => setPeriod("month")}
                  >
                    Mês
                  </ButtonGroupItem>
                  <ButtonGroupItem
                    active={period === "year"}
                    onClick={() => setPeriod("year")}
                  >
                    Ano
                  </ButtonGroupItem>
                </ButtonGroup>
                <p className="text-xs text-zinc-500">Selecionado: {period}</p>
              </CardContent>
            </Card>
          </section>

          <section id="sidebar" className="scroll-mt-24 space-y-4">
            <SectionHeader
              title="Sidebar"
              description="Navegação lateral compacta com grupos, ícones e footer."
            />
            <Card className="overflow-hidden p-0">
              <div className="flex h-[22rem]">
                <Sidebar className="h-full shrink-0 border-r-0">
                  <SidebarHeader>
                    <SidebarBrand href="#" logo={<AppLogo size={32} />} title="Numerae" subtitle="Finanças pessoais" />
                  </SidebarHeader>
                  <SidebarNav>
                    <SidebarGroup label="Principal">
                      <SidebarItem href="#" icon={categoryIcons.housing} active>
                        Painel
                      </SidebarItem>
                      <SidebarItem href="#" icon={categoryIcons.food} badge={<Badge>3</Badge>}>
                        Transações
                      </SidebarItem>
                      <SidebarItem href="#" icon={categoryIcons.leisure}>
                        Metas
                      </SidebarItem>
                    </SidebarGroup>
                    <SidebarGroup label="Conta">
                      <SidebarItem href="#">Configurações</SidebarItem>
                    </SidebarGroup>
                  </SidebarNav>
                  <SidebarFooter>
                    <p className="truncate text-xs text-zinc-500">usuario@email.com</p>
                  </SidebarFooter>
                </Sidebar>
                <div className="flex flex-1 items-center justify-center bg-zinc-50 p-6 text-sm text-zinc-500 dark:bg-zinc-900/40">
                  Área de conteúdo
                </div>
              </div>
            </Card>
          </section>

          <section id="icons" className="scroll-mt-24 space-y-4">
            <SectionHeader
              title="Icons"
              description="Despesas, metas e objetivos de vida, consumo, economia e utilitários."
            />
            <Card>
              <CardContent className="space-y-8 pt-6">
                {iconCategories.map((category) => (
                  <div key={category.label}>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      {category.label}
                    </p>
                    <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
                      {category.keys.map((name) => {
                        const IconComponent = icons[name];
                        if (!IconComponent) return null;
                        return (
                          <div
                            key={name}
                            className="flex flex-col items-center gap-1.5 rounded-lg border border-zinc-200 px-2 py-3 text-center dark:border-zinc-800"
                          >
                            <IconComponent size="xl" className="text-zinc-700 dark:text-zinc-300" />
                            <span className="text-[0.6rem] text-zinc-500">{name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          <section id="cards" className="scroll-mt-24 space-y-4">
            <SectionHeader
              title="Cards"
              description="Containers para dashboards e listagens."
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Saldo atual</CardTitle>
                  <CardDescription>Atualizado agora há pouco</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold tracking-tight">
                    R$ 4.280,50
                  </p>
                </CardContent>
                <CardFooter>
                  <Badge variant="success">+12% este mês</Badge>
                </CardFooter>
              </Card>

              <Card className="border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-zinc-950">
                <CardHeader>
                  <CardTitle>Meta de viagem</CardTitle>
                  <CardDescription>Faltam R$ 1.200</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-2 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950">
                    <div className="h-full w-[68%] rounded-full bg-emerald-500 transition-all duration-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <section id="data" className="scroll-mt-24 space-y-4">
            <SectionHeader
              title="Data & Tables"
              description="Stat cards, DataTable com filtro, ordenação e paginação."
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                label="Saldo total"
                value={4280.5}
                trend={12}
                trendLabel="vs. mês anterior"
                icon={categoryIcons.housing}
              />
              <StatCard
                label="Gastos do mês"
                value={-1842.3}
                trend={-4}
                trendLabel="vs. mês anterior"
                icon={categoryIcons.food}
              />
              <StatCard
                label="Economia"
                value={890}
                trend={8}
                trendLabel="da meta mensal"
                icon={categoryIcons.leisure}
              />
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Transações recentes</CardTitle>
                <CardDescription>
                  DataTable — busca, sort por coluna e paginação
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <DataTable
                  data={sampleTransactions}
                  columns={transactionColumns}
                  getRowKey={(row) => row.id}
                  pageSize={5}
                  searchPlaceholder="Buscar transações…"
                  searchFilter={(row, query) =>
                    [row.desc, row.category, row.date].some((field) =>
                      field.toLowerCase().includes(query),
                    )
                  }
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <EmptyState
                  icon={categoryIcons.transport}
                  title="Nenhuma transação pendente"
                  description="Quando houver lançamentos para revisar, eles aparecerão aqui."
                  action={
                    <Button size="sm" variant="secondary">
                      Importar extrato
                    </Button>
                  }
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Skeleton loading</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-2/3" />
              </CardContent>
            </Card>
          </section>

          <section id="layout" className="scroll-mt-24 space-y-4">
            <SectionHeader
              title="Layout"
              description="Container, Grid, Col, Row e Stack para alinhamento e espaçamento consistentes."
            />
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Grid system (12 colunas)</CardTitle>
                <CardDescription>
                  Colunas responsivas com span, spanSm e spanLg.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Grid cols={12} gap={3}>
                  <Col span={12}>
                    <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-center text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
                      span 12 — largura total
                    </div>
                  </Col>
                  <Col span={12} spanSm={6}>
                    <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-center text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
                      span 12 / sm 6
                    </div>
                  </Col>
                  <Col span={12} spanSm={6}>
                    <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-center text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
                      span 12 / sm 6
                    </div>
                  </Col>
                  {[1, 2, 3, 4].map((item) => (
                    <Col key={item} span={12} spanSm={6} spanLg={3}>
                      <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-center text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
                        span 12 / sm 6 / lg 3
                      </div>
                    </Col>
                  ))}
                </Grid>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Row & Stack</CardTitle>
                <CardDescription>Flex horizontal e vertical com gap e alinhamento.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-0">
                <div>
                  <p className="mb-2 text-[0.65rem] font-medium uppercase tracking-wider text-zinc-400">
                    Row
                  </p>
                  <Row gap={3} align="center" justify="between" wrap>
                    <Badge>Alinhado</Badge>
                    <Badge variant="outline">ao centro</Badge>
                    <Badge variant="success">entre extremos</Badge>
                  </Row>
                </div>
                <div>
                  <p className="mb-2 text-[0.65rem] font-medium uppercase tracking-wider text-zinc-400">
                    Stack
                  </p>
                  <Stack gap={3} align="stretch">
                    <div className="rounded-md border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950">
                      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        Bloco principal
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Itens empilhados verticalmente com espaçamento uniforme.
                      </p>
                    </div>
                    <div className="rounded-md border border-dashed border-zinc-300 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-700">
                      Segundo bloco
                    </div>
                    <div className="rounded-md border border-dashed border-zinc-300 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-700">
                      Terceiro bloco
                    </div>
                  </Stack>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Tooltip</CardTitle>
                <CardDescription>
                  `HoverTooltip` em botões/ícones; `TooltipAnchor` em gráficos e sliders.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="secondary" tooltip="Editar">
                    Ícone
                  </Button>
                  <HoverTooltip label="Remover">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
                    >
                      ×
                    </button>
                  </HoverTooltip>
                </div>
                <div className="relative h-12">
                  <TooltipAnchor className="bottom-1/2 left-[8%] -translate-y-1/2">
                    <Tooltip>Início</Tooltip>
                  </TooltipAnchor>
                  <TooltipAnchor className="bottom-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <Tooltip>Centro</Tooltip>
                  </TooltipAnchor>
                  <TooltipAnchor className="bottom-1/2 right-[8%] -translate-y-1/2">
                    <Tooltip>Fim</Tooltip>
                  </TooltipAnchor>
                  <div className="absolute inset-x-0 bottom-0 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800" />
                </div>
              </CardContent>
            </Card>
          </section>

          <section id="dashboard" className="scroll-mt-24 space-y-4">
            <SectionHeader
              title="Dashboard layout"
              description="Painel montado com Grid e Col — padrão para telas do app."
            />
            <Card>
              <CardContent className="pt-6">
                <Stack gap={6}>
                    <Row justify="between" align="end" wrap className="gap-4">
                      <div>
                        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                          Painel financeiro
                        </h3>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          Exemplo com grid de 12 colunas e alinhamento responsivo.
                        </p>
                      </div>
                      <Button size="sm">Nova transação</Button>
                    </Row>

                    <Grid cols={12} gap={4}>
                      <Col span={12} spanSm={6} spanLg={3}>
                        <StatCard label="Saldo" value={4280.5} trend={12} trendLabel="mês" />
                      </Col>
                      <Col span={12} spanSm={6} spanLg={3}>
                        <StatCard label="Gastos" value={-1842.3} trend={-4} trendLabel="mês" />
                      </Col>
                      <Col span={12} spanSm={6} spanLg={3}>
                        <StatCard label="Economia" value={890} trend={8} trendLabel="meta" />
                      </Col>
                      <Col span={12} spanSm={6} spanLg={3}>
                        <StatCard label="Investido" value={12500} trend={3} trendLabel="ano" />
                      </Col>
                    </Grid>

                    <Grid cols={12} gap={4}>
                      <Col span={12} spanLg={8}>
                        <Card className="h-full">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Resumo do mês</CardTitle>
                            <CardDescription>Receitas, despesas e saldo líquido</CardDescription>
                          </CardHeader>
                          <CardContent className="overflow-visible pt-0">
                            <DataList
                              items={[
                                { id: "1", label: "Receitas", value: "R$ 5.200,00" },
                                { id: "2", label: "Despesas", value: "R$ 1.842,30" },
                                {
                                  id: "3",
                                  label: "Saldo líquido",
                                  value: "R$ 3.357,70",
                                  hint: "Atualizado hoje",
                                },
                              ]}
                            />
                            <div className="mt-4 space-y-2">
                              <div className="flex justify-between text-xs">
                                <span className="text-zinc-500">Alocação do orçamento</span>
                              </div>
                              <StackedProgress
                                segments={[
                                  { value: 35, label: "Moradia" },
                                  { value: 22, label: "Alimentação" },
                                  { value: 14, label: "Transporte" },
                                  { value: 29, label: "Outros" },
                                ]}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      </Col>
                      <Col span={12} spanLg={4}>
                        <Stack gap={4}>
                          <Card>
                            <CardContent className="pt-4">
                              <p className="text-xs text-zinc-500">Saldo (7 dias)</p>
                              <Trend value={6.2} label="vs. semana anterior" className="mt-1" />
                              <Sparkline
                                points={balanceTrend}
                                labels={balanceTrendLabels}
                                className="mt-3"
                                formatValue={(value) =>
                                  value.toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  })
                                }
                              />
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">Orçamento</CardTitle>
                            </CardHeader>
                            <CardContent className="overflow-visible pt-0">
                              <DonutChart segments={budgetSegments} size={96} />
                            </CardContent>
                          </Card>
                        </Stack>
                      </Col>
                    </Grid>
                  </Stack>
              </CardContent>
            </Card>
          </section>

          <section id="charts" className="scroll-mt-24 space-y-4">
            <SectionHeader
              title="Charts"
              description="API unificada via Chart — alturas fixas, traços constantes, tooltips fora do container e animações."
            />
            <Grid cols={12} gap={4}>
              <Col span={12}>
                <Card id="chart-animate" className="scroll-mt-24">
                  <CardHeader className="pb-3">
                    <Row justify="between" align="center" wrap className="gap-3">
                      <div>
                        <CardTitle className="text-base">Transição de período</CardTitle>
                        <CardDescription>
                          Troque o intervalo — o gráfico anima a atualização dos dados.
                        </CardDescription>
                      </div>
                      <ButtonGroup>
                        <ButtonGroupItem
                          active={chartPeriod === "week"}
                          onClick={() => setChartPeriod("week")}
                        >
                          Semana
                        </ButtonGroupItem>
                        <ButtonGroupItem
                          active={chartPeriod === "month"}
                          onClick={() => setChartPeriod("month")}
                        >
                          Mês
                        </ButtonGroupItem>
                        <ButtonGroupItem
                          active={chartPeriod === "year"}
                          onClick={() => setChartPeriod("year")}
                        >
                          Ano
                        </ButtonGroupItem>
                      </ButtonGroup>
                    </Row>
                  </CardHeader>
                  <CardContent className="overflow-visible space-y-8 pt-0">
                    <div>
                      <p className="mb-2 text-xs font-medium text-zinc-500">Linha</p>
                      <Chart
                        variant="line"
                        data={chartPeriodData[chartPeriod]}
                        animateKey={chartPeriod}
                        formatValue={(value) =>
                          value.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })
                        }
                      />
                    </div>
                    <div className="overflow-visible rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                      <p className="mb-2 text-xs font-medium text-zinc-500">Sparkline</p>
                      <Chart
                        variant="sparkline"
                        data={chartPeriodData[chartPeriod]}
                        animateKey={chartPeriod}
                        formatValue={(value) =>
                          value.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })
                        }
                      />
                    </div>
                    <Grid cols={12} gap={4}>
                      <Col span={12} spanLg={4}>
                        <div className="overflow-visible rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                          <p className="mb-3 text-xs font-medium text-zinc-500">Barras</p>
                          <BarChart
                            data={chartBarPeriodData[chartPeriod]}
                            animateKey={chartPeriod}
                            stacked
                            formatValue={(value) =>
                              value.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                                maximumFractionDigits: 0,
                              })
                            }
                          />
                        </div>
                      </Col>
                      <Col span={12} spanLg={4}>
                        <div className="overflow-visible rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                          <p className="mb-3 text-xs font-medium text-zinc-500">Colunas</p>
                          <ColumnChart
                            data={chartColumnPeriodData[chartPeriod]}
                            animateKey={chartPeriod}
                            stacked
                            formatValue={(value) =>
                              value.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                                maximumFractionDigits: 0,
                              })
                            }
                          />
                        </div>
                      </Col>
                      <Col span={12} spanLg={4}>
                        <div className="overflow-visible rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                          <p className="mb-3 text-xs font-medium text-zinc-500">Donut</p>
                          <DonutChart
                            segments={chartDonutPeriodData[chartPeriod]}
                            animateKey={chartPeriod}
                            size={96}
                          />
                        </div>
                      </Col>
                    </Grid>
                  </CardContent>
                </Card>
              </Col>
              <Col span={12} spanLg={4}>
                <Card id="chart-sparkline" className="h-full scroll-mt-24">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Sparkline</CardTitle>
                    <CardDescription>Evolução compacta para cards e stats</CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-visible pt-0">
                    <Sparkline
                      points={balanceTrend}
                      labels={balanceTrendLabels}
                      formatValue={(value) =>
                        value.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })
                      }
                    />
                  </CardContent>
                </Card>
              </Col>
              <Col span={12} spanLg={4}>
                <Card id="chart-bars" className="h-full scroll-mt-24">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Barras horizontais</CardTitle>
                    <CardDescription>Comparativo por categoria</CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-visible pt-0">
                    <BarChart
                      data={stackedSpendingBars}
                      stacked
                      formatValue={(value) =>
                        value.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                          maximumFractionDigits: 0,
                        })
                      }
                    />
                  </CardContent>
                </Card>
              </Col>
              <Col span={12} spanLg={4}>
                <Card id="chart-donut" className="h-full scroll-mt-24">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Donut</CardTitle>
                    <CardDescription>Distribuição com legenda interativa</CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-visible pt-0">
                    <DonutChart segments={budgetSegments} size={96} />
                  </CardContent>
                </Card>
              </Col>
              <Col span={12} spanLg={6}>
                <Card id="chart-columns" className="h-full scroll-mt-24">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Colunas</CardTitle>
                    <CardDescription>Eixo Y + labels horizontais + hover</CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-visible pt-0">
                    <ColumnChart
                      data={stackedColumns}
                      stacked
                      formatValue={(value) =>
                        value.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                          maximumFractionDigits: 0,
                        })
                      }
                    />
                  </CardContent>
                </Card>
              </Col>
              <Col span={12} spanLg={6}>
                <Card id="chart-line" className="h-full scroll-mt-24">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Linha completa</CardTitle>
                    <CardDescription>Grid, eixos, crosshair e área só em linha única</CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-visible pt-0">
                    <LineChart
                      data={weeklyBalance}
                      series={balanceSeries}
                      formatValue={(value) =>
                        value.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })
                      }
                    />
                  </CardContent>
                </Card>
              </Col>
              <Col span={12}>
                <Card id="chart-line-full" className="scroll-mt-24">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Linha — largura total</CardTitle>
                    <CardDescription>
                      Preenche 100% do container com <code className="text-xs">fullWidth</code>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-visible pt-0">
                    <LineChart
                      fullWidth
                      data={weeklyBalance}
                      series={[balanceSeries[0]]}
                      formatValue={(value) =>
                        value.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })
                      }
                    />
                  </CardContent>
                </Card>
              </Col>
            </Grid>
          </section>

          <section id="progress" className="scroll-mt-24 space-y-4">
            <SectionHeader
              title="Progress"
              description="Barra simples e empilhada com hover nos segmentos."
            />
            <Grid cols={12} gap={4}>
              <Col span={12} spanLg={6}>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Progress simples</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    <div>
                      <div className="mb-1.5 flex justify-between text-xs">
                        <span className="text-zinc-500">Meta viagem</span>
                        <span className="tabular-nums text-zinc-600">68%</span>
                      </div>
                      <Progress value={68} />
                    </div>
                    <div>
                      <div className="mb-1.5 flex justify-between text-xs">
                        <span className="text-zinc-500">Orçamento lazer</span>
                        <span className="tabular-nums text-amber-600">92%</span>
                      </div>
                      <Progress value={92} variant="warning" />
                    </div>
                    <div>
                      <div className="mb-1.5 flex justify-between text-xs">
                        <span className="text-zinc-500">Compacto</span>
                        <span className="tabular-nums text-zinc-600">45%</span>
                      </div>
                      <Progress value={45} size="sm" variant="success" />
                    </div>
                  </CardContent>
                </Card>
              </Col>
              <Col span={12} spanLg={6}>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Stacked progress</CardTitle>
                    <CardDescription>
                      Vários segmentos (10%, 20%, 30%…) cada um com cor própria.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5 pt-0">
                    <div>
                      <p className="mb-2 text-xs text-zinc-500">Exemplo 10 / 20 / 30</p>
                      <StackedProgress
                        segments={[
                          { value: 10, label: "Moradia" },
                          { value: 20, label: "Alimentação" },
                          { value: 30, label: "Transporte" },
                        ]}
                      />
                    </div>
                    <div>
                      <p className="mb-2 text-xs text-zinc-500">Orçamento completo (100%)</p>
                      <StackedProgress
                        segments={[
                          { value: 35, label: "Moradia", className: "bg-emerald-500" },
                          { value: 22, label: "Alimentação", className: "bg-sky-500" },
                          { value: 14, label: "Transporte", className: "bg-amber-500" },
                          { value: 12, label: "Lazer", className: "bg-violet-500" },
                          { value: 17, label: "Outros", className: "bg-rose-500" },
                        ]}
                      />
                      <Row gap={3} wrap className="mt-3">
                        {budgetSegments.map((segment, index) => (
                          <Row key={segment.label} gap={2} align="center">
                            <span
                              className={cn(
                                "h-2 w-2 rounded-full",
                                [
                                  "bg-emerald-500",
                                  "bg-sky-500",
                                  "bg-amber-500",
                                  "bg-violet-500",
                                  "bg-rose-500",
                                ][index],
                              )}
                            />
                            <span className="text-[0.65rem] text-zinc-500">{segment.label}</span>
                          </Row>
                        ))}
                      </Row>
                    </div>
                  </CardContent>
                </Card>
              </Col>
            </Grid>
          </section>

          <section id="inputs" className="scroll-mt-24 space-y-4">
            <SectionHeader
              title="Inputs"
              description="Validação com feedback visual, regras reutilizáveis e estados acessíveis."
            />
            <Card id="input-states" className="scroll-mt-24">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Estados visuais</CardTitle>
                <CardDescription>
                  Erro, sucesso e aviso — bordas, fundo, label, ícone e mensagem.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 pt-0 md:grid-cols-3">
                <Field
                  label="Erro"
                  message="Use um e-mail válido (ex: voce@email.com)."
                  state="error"
                  required
                >
                  <Input
                    defaultValue="usuario@"
                    {...fieldControlProps("error", "pr-8")}
                  />
                </Field>
                <Field label="Sucesso" message="Valor válido." state="success">
                  <Input defaultValue="1.250,00" {...fieldControlProps("success", "pr-8")} />
                </Field>
                <Field
                  label="Aviso"
                  message="Quase no limite de caracteres."
                  state="warning"
                  counter="48/60"
                >
                  <Textarea
                    defaultValue="Almoço com equipe no centro da cidade"
                    {...fieldControlProps("warning")}
                  />
                </Field>
              </CardContent>
            </Card>
            <Card id="input-form" className="scroll-mt-24">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Formulário interativo</CardTitle>
                <CardDescription>
                  Validação em tempo real, no blur e no submit — com{" "}
                  <code className="text-[0.7rem]">useValidatedField</code> e{" "}
                  <code className="text-[0.7rem]">validationRules</code>.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5 pt-0 md:grid-cols-2">
                <Field
                  label="E-mail"
                  htmlFor="demo-email"
                  message={emailField.validation.message ?? "Validação em tempo real."}
                  state={emailField.validation.state}
                  required
                >
                  <Input
                    id="demo-email"
                    placeholder="voce@email.com"
                    value={emailField.value}
                    onChange={(event) => emailField.setValue(event.target.value)}
                    onBlur={emailField.bind.onBlur}
                    {...emailField.fieldProps}
                  />
                </Field>
                <Field
                  label="Valor (R$)"
                  htmlFor="demo-amount"
                  message={
                    amountField.validation.message ??
                    "Valida ao sair do campo ou ao enviar."
                  }
                  state={amountField.validation.state}
                  required
                >
                  <Input
                    id="demo-amount"
                    placeholder="1.250,50"
                    value={amountField.value}
                    onChange={(event) => amountField.setValue(event.target.value)}
                    onBlur={amountField.bind.onBlur}
                    {...amountField.fieldProps}
                  />
                </Field>
                <Field
                  label="Descrição"
                  htmlFor="demo-description"
                  message={descriptionValidation.message ?? "Opcional — máximo 60 caracteres."}
                  state={descriptionValidation.state}
                  counter={descriptionLength.counter}
                  controlSize="textarea"
                  className="md:col-span-2"
                >
                  <Textarea
                    id="demo-description"
                    placeholder="Observações da transação..."
                    value={descriptionValue}
                    onChange={(event) => setDescriptionValue(event.target.value)}
                    onBlur={() => setDescriptionTouched(true)}
                    {...fieldControlProps(descriptionValidation.state, "pr-3")}
                  />
                </Field>
                <div className="flex flex-wrap gap-2 md:col-span-2">
                  <Button
                    onClick={() => {
                      emailField.markSubmitted();
                      amountField.markSubmitted();
                      setDescriptionTouched(true);

                      const formValid =
                        emailField.isValid &&
                        amountField.isValid &&
                        descriptionValidation.isValid;

                      if (formValid) {
                        toast("Todos os campos passaram na validação.", "success");
                      } else {
                        toast("Corrija os erros antes de continuar.", "error");
                      }
                    }}
                  >
                    Validar formulário
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      emailField.reset();
                      amountField.reset();
                      setDescriptionValue("");
                      setDescriptionTouched(false);
                    }}
                  >
                    Limpar
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card id="input-basic" className="scroll-mt-24">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Campos básicos</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5 pt-0 md:grid-cols-2">
                <Field label="Texto" hint="Nome da transação ou estabelecimento.">
                  <Input placeholder="Ex: Supermercado" />
                </Field>
                <Field label="Número" hint="Use vírgula para centavos.">
                  <NumberInput placeholder="0,00" step="0.01" />
                </Field>
                <Field label="Textarea" hint="Opcional." className="md:col-span-2">
                  <Textarea placeholder="Observações..." />
                </Field>
              </CardContent>
            </Card>
          </section>

          <section id="pickers" className="scroll-mt-24 space-y-4">
            <SectionHeader
              title="Pickers"
              description="Date, time e cor — controles compactos alinhados ao restante do formulário."
            />
            <Card>
              <CardContent className="grid gap-6 pt-6 md:grid-cols-2">
                <DatePicker
                  label="Data"
                  value={dateValue}
                  onChange={setDateValue}
                />
                <TimePicker
                  label="Hora"
                  value={timeValue}
                  onChange={setTimeValue}
                />
                <div className="md:col-span-2">
                  <DateTimePicker
                    label="Data e hora"
                    value={dateTimeValue}
                    onChange={setDateTimeValue}
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Color Picker</CardTitle>
                <CardDescription>
                  Modo completo com hex editável e modo compacto para tabelas inline.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 pt-0 md:grid-cols-2">
                <ColorPicker
                  label="Cor da marca"
                  value={colorValue}
                  onChange={setColorValue}
                />
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Compacto</p>
                  <div className="flex min-h-9 items-center gap-3">
                    <ColorPicker compact value={colorValue} onChange={setColorValue} />
                    <span className="font-mono text-sm text-zinc-600 dark:text-zinc-400">
                      {colorValue}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section id="otp" className="scroll-mt-24 space-y-4">
            <SectionHeader
              title="OTP Input"
              description="Um campo por caractere, com paste e navegação por teclado."
            />
            <Card>
              <CardContent className="pt-6">
                <OtpInput value={otpValue} onChange={setOtpValue} />
                <p className="mt-4 text-center text-sm text-zinc-500">
                  Valor: {otpValue || "—"}
                </p>
              </CardContent>
            </Card>
          </section>

          <section id="select" className="scroll-mt-24 space-y-4">
            <SectionHeader
              title="Dropdown"
              description="Select para valor único e MultiSelect para múltipla escolha com tags removíveis."
            />

            <Card id="select-single" className="scroll-mt-24">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Select</CardTitle>
                <CardDescription>
                  Valor único — ícones, descrições e destaque suave no menu.
                </CardDescription>
              </CardHeader>
              <CardContent className="max-w-sm pt-0">
                <Select
                  label="Categoria"
                  options={categoryOptions}
                  value={selectValue}
                  onChange={setSelectValue}
                />
                <p className="mt-3 text-xs text-zinc-500">
                  Selecionado: <code className="text-[0.7rem]">{selectValue}</code>
                </p>
              </CardContent>
            </Card>

            <Card id="select-multi" className="scroll-mt-24">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">MultiSelect</CardTitle>
                <CardDescription>
                  Múltipla escolha com tags removíveis, checkboxes no menu e portal acima de modais.
                  Usado em tratamentos de conversão (comparar instituições).
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 pt-0 md:grid-cols-2">
                <div className="space-y-4">
                  <MultiSelect
                    label="Instituições"
                    placeholder="Escolha instituições…"
                    options={institutionOptions}
                    value={multiSelectValue}
                    onChange={setMultiSelectValue}
                  />
                  <p className="text-xs text-zinc-500">
                    Selecionadas:{" "}
                    {multiSelectValue.length > 0 ? (
                      <code className="text-[0.7rem]">{multiSelectValue.join(", ")}</code>
                    ) : (
                      "nenhuma"
                    )}
                  </p>
                </div>
                <div className="space-y-4">
                  <MultiSelect
                    size="sm"
                    label="Vazio (sm)"
                    placeholder="Comparar rotas…"
                    options={institutionOptions}
                    value={multiSelectEmpty}
                    onChange={setMultiSelectEmpty}
                  />
                  <p className="text-xs text-zinc-500">
                    Clique nas tags para remover · menu com checkbox por opção
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          <section id="accordion" className="scroll-mt-24 space-y-4">
            <SectionHeader
              title="Accordion"
              description="Itens soltos ou agrupados em um bloco único."
            />
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Separado
                </p>
                <Accordion defaultValue="item-1">
                  <AccordionItem value="item-1" title="Saldo e contas">
                    Veja todas as contas conectadas e saldos atualizados.
                  </AccordionItem>
                  <AccordionItem value="item-2" title="Metas ativas">
                    Acompanhe progresso de metas financeiras.
                  </AccordionItem>
                </Accordion>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Grupo
                </p>
                <AccordionGroup defaultValue="g1">
                  <AccordionItem value="g1" title="Como funciona?">
                    Organize finanças com interface compacta e mobile-first.
                  </AccordionItem>
                  <AccordionItem value="g2" title="Funciona no celular?">
                    Sidebar, tabs e pickers adaptam-se a telas pequenas.
                  </AccordionItem>
                  <AccordionItem value="g3" title="É seguro?">
                    Login com verificação de e-mail e sessões protegidas.
                  </AccordionItem>
                </AccordionGroup>
              </div>
            </div>
          </section>

          <section id="choices" className="scroll-mt-24 space-y-4">
            <SectionHeader
              title="Checkbox & Radio"
              description="Controles de seleção com estilo customizado."
            />
            <Card>
              <CardContent className="grid gap-6 pt-6 sm:grid-cols-2">
                <div className="space-y-3">
                  <Checkbox label="Receber alertas por e-mail" defaultChecked />
                  <Checkbox label="Incluir transações recorrentes" />
                </div>
                <RadioGroup
                  name="account-type"
                  value={accountType}
                  onChange={setAccountType}
                  options={[
                    { value: "checking", label: "Conta corrente" },
                    { value: "savings", label: "Poupança" },
                    { value: "investment", label: "Investimentos" },
                  ]}
                />
              </CardContent>
            </Card>
          </section>

          <section id="tabs" className="scroll-mt-24 space-y-4">
            <SectionHeader
              title="Tabs"
              description="Segment control compacto com scroll horizontal no mobile."
            />
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Visão geral</TabsTrigger>
                <TabsTrigger value="details">Detalhes</TabsTrigger>
                <TabsTrigger value="settings">Configurações</TabsTrigger>
              </TabsList>
              <TabsContent value="overview">
                Resumo das finanças do mês com saldo e metas principais.
              </TabsContent>
              <TabsContent value="details">
                Lista detalhada de transações, categorias e tendências.
              </TabsContent>
              <TabsContent value="settings">
                Preferências de notificação, moeda e privacidade.
              </TabsContent>
            </Tabs>
          </section>

          <section id="slider" className="scroll-mt-24 space-y-4">
            <SectionHeader
              title="Slider"
              description="Tooltip com o valor enquanto você arrasta."
            />
            <Card>
              <CardContent className="max-w-md pt-6">
                <Slider
                  label="Progresso da meta"
                  value={sliderValue}
                  onChange={(event) =>
                    setSliderValue(Number(event.target.value))
                  }
                  formatValue={(value) => `${value}%`}
                  showHint
                />
              </CardContent>
            </Card>
          </section>

          <section id="loading" className="scroll-mt-24 space-y-4">
            <SectionHeader
              title="Loader & Dimmer"
              description="Estados de carregamento e overlay de fundo."
            />
            <Card>
              <CardContent className="flex flex-wrap items-center gap-6 pt-6">
                <Spinner size="sm" />
                <Spinner size="md" />
                <Spinner size="lg" />
                <Separator orientation="vertical" className="hidden h-8 sm:block" />
                <Loader inline label="Sincronizando..." />
              </CardContent>
            </Card>
          </section>

          <section id="modal" className="scroll-mt-24 space-y-4">
            <SectionHeader
              title="Modal"
              description="Diálogos com tons visuais para confirmação, sucesso, aviso e erro."
            />
            <Card id="modal-default" className="scroll-mt-24">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Modal padrão</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Button size="sm" variant="secondary" onClick={() => setModalOpen(true)}>
                  Abrir modal padrão
                </Button>
              </CardContent>
            </Card>

            <Card id="modal-tones" className="scroll-mt-24">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Modais com tom</CardTitle>
                <CardDescription>Cores e ícones por tipo de mensagem.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 pt-0">
                <Button size="sm" onClick={() => setModalSuccessOpen(true)}>
                  Sucesso
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setModalWarningOpen(true)}>
                  Aviso
                </Button>
                <Button size="sm" variant="danger" onClick={() => setModalErrorOpen(true)}>
                  Erro
                </Button>
              </CardContent>
            </Card>

            <Modal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              title="Confirmar ação"
              description="Exemplo de diálogo compacto."
              message="Deseja salvar as alterações nesta transação?"
              footer={
                <>
                  <Button size="sm" variant="ghost" onClick={() => setModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={() => setModalOpen(false)}>
                    Confirmar
                  </Button>
                </>
              }
            />

            <Modal
              open={modalSuccessOpen}
              onClose={() => setModalSuccessOpen(false)}
              tone="success"
              title="Transação salva"
              message="Suas alterações foram registradas com sucesso."
              footer={
                <Button size="sm" onClick={() => setModalSuccessOpen(false)}>
                  Ok
                </Button>
              }
            />

            <Modal
              open={modalWarningOpen}
              onClose={() => setModalWarningOpen(false)}
              tone="warning"
              title="Orçamento quase no limite"
              message="Você já usou 92% do orçamento de lazer deste mês."
              footer={
                <>
                  <Button size="sm" variant="ghost" onClick={() => setModalWarningOpen(false)}>
                    Depois
                  </Button>
                  <Button size="sm" onClick={() => setModalWarningOpen(false)}>
                    Revisar
                  </Button>
                </>
              }
            />

            <Modal
              open={modalErrorOpen}
              onClose={() => setModalErrorOpen(false)}
              tone="error"
              title="Não foi possível sincronizar"
              message="Verifique sua conexão e tente novamente em instantes."
              footer={
                <Button size="sm" variant="danger" onClick={() => setModalErrorOpen(false)}>
                  Tentar de novo
                </Button>
              }
            />
          </section>

          <section id="toggles" className="scroll-mt-24 space-y-4">
            <SectionHeader
              title="Toggles"
              description="Switch compacto."
            />
            <Card>
              <CardContent className="flex flex-wrap gap-6 pt-6">
                <Switch
                  label="Notificações"
                  checked={notifications}
                  onChange={(event) => setNotifications(event.target.checked)}
                />
              </CardContent>
            </Card>
          </section>

          <section id="feedback" className="scroll-mt-24 space-y-4">
            <SectionHeader
              title="Alerts & Toasts"
              description="Feedback inline e notificações fecháveis."
            />
            <Card>
              <CardContent className="space-y-3 pt-6">
                <Alert variant="info" title="Dica">
                  Transação categorizada automaticamente com base no histórico.
                </Alert>
                <Alert variant="success" title="Meta atingida">
                  Você economizou R$ 890 este mês — 8% acima da meta.
                </Alert>
                <Alert variant="warning" title="Atenção">
                  Orçamento de lazer quase no limite — restam R$ 48.
                </Alert>
                <Alert variant="error" title="Falha na sincronização">
                  Não foi possível atualizar a conta. Tente novamente.
                </Alert>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => toast("Salvo com sucesso!", "success")}
                  >
                    Toast success
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => toast("Algo deu errado.", "error")}
                  >
                    Toast error
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toast("Nova atualização disponível.", "info")}
                  >
                    Toast info
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => toast("Orçamento quase no limite.", "warning")}
                  >
                    Toast warning
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          <section id="badges" className="scroll-mt-24 space-y-4">
            <SectionHeader title="Badges" description="Etiquetas de status." />
            <Card>
              <CardContent className="flex flex-wrap gap-2 pt-6">
                <Badge>Default</Badge>
                <Badge variant="success">Pago</Badge>
                <Badge variant="warning">Pendente</Badge>
                <Badge variant="error">Atrasado</Badge>
                <Badge variant="outline">Recorrente</Badge>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-zinc-200 pb-3 dark:border-zinc-800">
      <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        {title}
      </h2>
      <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{description}</p>
    </div>
  );
}
