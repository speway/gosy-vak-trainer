"use client";

import * as React from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FlaskConical,
  Info,
  Layers,
  LayoutDashboard,
  ListChecks,
  Mic,
  Pause,
  Play,
  Puzzle,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Shuffle,
  Trophy,
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Mode =
  | "overview"
  | "tickets"
  | "cards"
  | "quiz"
  | "cases"
  | "oral"
  | "sources";

type Ticket = {
  id: string;
  number: number;
  section: string;
  title: string;
  shortTitle: string;
  summary: string;
  keyPoints: string[];
  keywords: string[];
  oralPlan: string[];
  answer: string;
  source: string;
  sourceLevel: "preferred" | "archive";
  wordCount: number;
  estimatedMinutes: number;
  difficulty: string;
};

type Section = {
  id: string;
  number: number;
  title: string;
  ticketRange: [number, number];
  ticketCount: number;
};

type CaseItem = {
  id: string;
  number: number;
  title: string;
  prompt: string;
  archiveSolution: string;
  rubric: string[];
  redFlags: string[];
  status: string;
};

type StudyContent = {
  meta: {
    title: string;
    subtitle: string;
    generatedAt: string;
    ticketCount: number;
    caseCount: number;
    sectionCount: number;
    contentNotice: string;
  };
  sections: Section[];
  tickets: Ticket[];
  cases: CaseItem[];
  sourceSummary: Record<string, number>;
};

type SourceAudit = {
  intendedUse: string;
  grain: string;
  checks: { check: string; result: string; severity: "ok" | "low" | "high" }[];
  sources: { name: string; role: string; decision: string }[];
  openRisks: string[];
};

type QuizOption = {
  id: "A" | "B" | "C" | "D";
  text: string;
  feedback: string;
};

type AdvancedQuizQuestion = {
  id: string;
  section: string;
  ticketNumber: number;
  kind: string;
  difficulty: string;
  context: string;
  question: string;
  options: QuizOption[];
  correctId: QuizOption["id"];
  hint: string;
  explanation: string;
  sources: string[];
};

type AdvancedQuizBank = {
  meta: {
    title: string;
    version: string;
    questionCount: number;
    methodology: string;
  };
  questions: AdvancedQuizQuestion[];
};

type ProgressState = {
  ratings: Record<string, 0 | 1 | 2 | 3>;
  solvedCases: string[];
  quizCorrect: number;
  quizAnswered: number;
  studyDays: string[];
};

const STORAGE_KEY = "examarium-progress-v1";

const EMPTY_PROGRESS: ProgressState = {
  ratings: {},
  solvedCases: [],
  quizCorrect: 0,
  quizAnswered: 0,
  studyDays: [],
};

const NAV_ITEMS: {
  id: Mode;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "overview", label: "Обзор", shortLabel: "Обзор", icon: LayoutDashboard },
  { id: "tickets", label: "Билеты", shortLabel: "Билеты", icon: BookOpen },
  { id: "cards", label: "Карточки", shortLabel: "Карты", icon: Layers },
  { id: "quiz", label: "Проверка знаний", shortLabel: "Тест", icon: Brain },
  { id: "cases", label: "Кейсы", shortLabel: "Кейсы", icon: Puzzle },
  { id: "oral", label: "Устный ответ", shortLabel: "Ответ", icon: Mic },
  { id: "sources", label: "Источники и качество", shortLabel: "Источники", icon: ShieldCheck },
];

const MOBILE_NAV_ITEMS = NAV_ITEMS.filter(
  (item) => item.id !== "overview" && item.id !== "sources",
);

const MODE_META: Record<Mode, { eyebrow: string; title: string; description: string }> = {
  overview: {
    eyebrow: "Центр подготовки",
    title: "Что учим сегодня",
    description: "Продолжай с места, где остановился, или выбери режим подготовки.",
  },
  tickets: {
    eyebrow: "70 экзаменационных вопросов",
    title: "Билеты",
    description: "Краткий каркас, план ответа и полный конспект в одном месте.",
  },
  cards: {
    eyebrow: "Активное воспроизведение",
    title: "Карточки",
    description: "Сначала вспомни ответ, потом открой опоры и оцени себя честно.",
  },
  quiz: {
    eyebrow: "Экспертная самопроверка",
    title: "Сложный экзаменационный тест",
    description: "Различай близкие теории, находи методологические ошибки и решай мини-кейсы с разбором каждого варианта.",
  },
  cases: {
    eyebrow: "35 практических ситуаций",
    title: "Кейсы",
    description: "Тренируй гипотезы, диагностику, вмешательство и этическую аргументацию.",
  },
  oral: {
    eyebrow: "Репетиция перед комиссией",
    title: "Устный ответ",
    description: "Получай случайный билет, запускай таймер и собирай связный ответ.",
  },
  sources: {
    eyebrow: "Научная база",
    title: "Источники и качество корпуса",
    description: "Какие учебники и первоисточники лежат в основе заданий, а где нужна ручная сверка.",
  },
};

const SECTION_ACCENTS = [
  "#4f67ff",
  "#ff6b57",
  "#20a4a5",
  "#a461e8",
  "#e79b21",
  "#3185fc",
  "#d94c7d",
  "#64748b",
  "#00a6a6",
  "#7c5cff",
  "#e55c45",
  "#4b8f63",
  "#c57a18",
];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getRatingLabel(rating: number) {
  if (rating === 3) return "Знаю";
  if (rating === 2) return "Повторить";
  if (rating === 1) return "Трудно";
  return "Не начато";
}

function getRatingClass(rating: number) {
  if (rating === 3) return "status-known";
  if (rating === 2) return "status-learning";
  if (rating === 1) return "status-hard";
  return "status-new";
}

function getStreak(studyDays: string[]) {
  const unique = new Set(studyDays);
  const date = new Date();
  let streak = 0;
  for (let offset = 0; offset < 365; offset += 1) {
    const key = date.toISOString().slice(0, 10);
    if (!unique.has(key)) break;
    streak += 1;
    date.setUTCDate(date.getUTCDate() - 1);
  }
  return streak;
}

function markStudyDay(progress: ProgressState) {
  const today = todayKey();
  if (progress.studyDays.includes(today)) return progress.studyDays;
  return [...progress.studyDays.slice(-59), today];
}

const PROGRESS_EVENT = "examarium-progress-change";

function parseProgressSnapshot(raw: string | null): ProgressState {
  if (!raw) return EMPTY_PROGRESS;
  try {
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    return {
      ratings: parsed.ratings ?? {},
      solvedCases: Array.isArray(parsed.solvedCases) ? parsed.solvedCases : [],
      quizCorrect: Number(parsed.quizCorrect) || 0,
      quizAnswered: Number(parsed.quizAnswered) || 0,
      studyDays: Array.isArray(parsed.studyDays) ? parsed.studyDays : [],
    };
  } catch {
    return EMPTY_PROGRESS;
  }
}

function subscribeToProgress(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(PROGRESS_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(PROGRESS_EVENT, onStoreChange);
  };
}

function getProgressSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY) ?? "";
}

function TrainerNavigation({
  mode,
  onModeChange,
  counts,
}: {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  counts: { due: number; cases: number };
}) {
  const { setOpenMobile } = useSidebar();

  return (
    <>
      <SidebarHeader className="sidebar-brand">
        <button
          className="brand-lockup"
          type="button"
          onClick={() => onModeChange("overview")}
          aria-label="Открыть обзор"
        >
          <span className="brand-mark" aria-hidden="true">
            Э
          </span>
          <span>
            <strong>Экзаменариум</strong>
            <small>ГОС · психология</small>
          </span>
        </button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Режим подготовки</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      size="lg"
                      isActive={mode === item.id}
                      tooltip={item.label}
                      onClick={() => {
                        onModeChange(item.id);
                        setOpenMobile(false);
                      }}
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                    {item.id === "cards" && counts.due > 0 ? (
                      <SidebarMenuBadge>{counts.due}</SidebarMenuBadge>
                    ) : null}
                    {item.id === "cases" && counts.cases > 0 ? (
                      <SidebarMenuBadge>{counts.cases}</SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="sidebar-note">
        <div className="sidebar-note-icon">
          <FlaskConical />
        </div>
        <div>
          <strong>70 билетов</strong>
          <span>20 книг · 39 сложных заданий</span>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </>
  );
}

function LoadingScreen() {
  return (
    <div className="loading-shell" aria-live="polite">
      <div className="loading-topline">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="loading-grid">
        <Skeleton className="h-60 rounded-[28px]" />
        <Skeleton className="h-60 rounded-[28px]" />
        <Skeleton className="h-60 rounded-[28px]" />
      </div>
      <span className="sr-only">Загружаем учебные материалы</span>
    </div>
  );
}

function PageHeading({ mode }: { mode: Mode }) {
  const meta = MODE_META[mode];
  return (
    <header className="page-heading">
      <div>
        <p className="eyebrow">{meta.eyebrow}</p>
        <h1>{meta.title}</h1>
        <p>{meta.description}</p>
      </div>
      <div className="heading-seal" aria-hidden="true">
        <span>{mode === "overview" ? "70" : NAV_ITEMS.findIndex((item) => item.id === mode) + 1}</span>
        <small>{mode === "overview" ? "билетов" : "режим"}</small>
      </div>
    </header>
  );
}

function Overview({
  data,
  progress,
  onModeChange,
  onOpenTicket,
}: {
  data: StudyContent;
  progress: ProgressState;
  onModeChange: (mode: Mode) => void;
  onOpenTicket: (ticket: Ticket) => void;
}) {
  const known = data.tickets.filter((ticket) => progress.ratings[ticket.id] === 3).length;
  const learning = data.tickets.filter((ticket) => {
    const rating = progress.ratings[ticket.id] ?? 0;
    return rating > 0 && rating < 3;
  }).length;
  const nextTicket =
    data.tickets.find((ticket) => progress.ratings[ticket.id] === 1) ??
    data.tickets.find((ticket) => progress.ratings[ticket.id] === 2) ??
    data.tickets.find((ticket) => !progress.ratings[ticket.id]) ??
    data.tickets[0];
  const percentage = Math.round((known / data.tickets.length) * 100);
  const quizAccuracy = progress.quizAnswered
    ? Math.round((progress.quizCorrect / progress.quizAnswered) * 100)
    : 0;
  const streak = getStreak(progress.studyDays);

  return (
    <div className="overview-stack">
      <section className="overview-hero">
        <div className="today-card">
          <div className="today-copy">
            <div className="mode-chip">
              <Clock />
              Следующий билет · {nextTicket.estimatedMinutes} мин
            </div>
            <p className="ticket-kicker">
              Билет {String(nextTicket.number).padStart(2, "0")} · {nextTicket.section}
            </p>
            <h2>{nextTicket.shortTitle}</h2>
            <p className="today-summary">{nextTicket.summary}</p>
            <div className="hero-actions">
              <Button className="action-primary" onClick={() => onOpenTicket(nextTicket)}>
                Открыть билет
                <ArrowRight />
              </Button>
              <Button variant="outline" className="action-quiet" onClick={() => onModeChange("cards")}>
                Учить карточками
              </Button>
            </div>
          </div>
          <div className="progress-orbit" style={{ "--progress": `${percentage * 3.6}deg` } as React.CSSProperties}>
            <div>
              <strong>{percentage}%</strong>
              <span>освоено</span>
            </div>
          </div>
        </div>

        <div className="metrics-column">
          <article className="metric-card metric-cobalt">
            <span>Знаю</span>
            <strong>{known}</strong>
            <small>из {data.tickets.length} билетов</small>
          </article>
          <article className="metric-card metric-coral">
            <span>В работе</span>
            <strong>{learning}</strong>
            <small>нуждаются в повторении</small>
          </article>
          <article className="metric-card metric-ink">
            <span>Точность</span>
            <strong>{quizAccuracy}%</strong>
            <small>{progress.quizAnswered || "нет"} ответов в тесте</small>
          </article>
          <article className="metric-card metric-sun">
            <span>Серия</span>
            <strong>{streak}</strong>
            <small>{streak === 1 ? "день" : "дней"} подряд</small>
          </article>
        </div>
      </section>

      <section className="quick-modes" aria-labelledby="quick-modes-title">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Выбери нагрузку</p>
            <h2 id="quick-modes-title">Три способа не просто перечитать</h2>
          </div>
        </div>
        <div className="mode-cards">
          <button className="mode-card" type="button" onClick={() => onModeChange("cards")}>
            <Layers />
            <span>10–15 минут</span>
            <h3>Карточки</h3>
            <p>Воспроизведи структуру ответа до подсказки и оцени сложность.</p>
            <ChevronRight />
          </button>
          <button className="mode-card" type="button" onClick={() => onModeChange("quiz")}>
            <Brain />
            <span>15–25 минут</span>
            <h3>Экспертный тест</h3>
            <p>Различай близкие теории, проверяй механизм и защищай лучший ответ.</p>
            <ChevronRight />
          </button>
          <button className="mode-card" type="button" onClick={() => onModeChange("oral")}>
            <Mic />
            <span>3–5 минут</span>
            <h3>Устный ответ</h3>
            <p>Репетируй связный ответ с таймером и чек-листом комиссии.</p>
            <ChevronRight />
          </button>
        </div>
      </section>

      <section className="section-map" aria-labelledby="section-map-title">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Карта программы</p>
            <h2 id="section-map-title">13 разделов</h2>
          </div>
          <Button variant="ghost" onClick={() => onModeChange("tickets")}>
            Все билеты
            <ArrowRight />
          </Button>
        </div>
        <div className="section-grid">
          {data.sections.map((section, index) => {
            const sectionTickets = data.tickets.filter((ticket) => ticket.section === section.title);
            const sectionKnown = sectionTickets.filter((ticket) => progress.ratings[ticket.id] === 3).length;
            const value = Math.round((sectionKnown / sectionTickets.length) * 100);
            return (
              <button
                type="button"
                className="section-card"
                key={section.id}
                onClick={() => onModeChange("tickets")}
                style={{ "--section-accent": SECTION_ACCENTS[index] } as React.CSSProperties}
              >
                <span className="section-number">{String(section.number).padStart(2, "0")}</span>
                <div>
                  <h3>{section.title}</h3>
                  <p>
                    Билеты {section.ticketRange[0]}–{section.ticketRange[1]} · {sectionKnown}/{section.ticketCount}
                  </p>
                </div>
                <Progress value={value} aria-label={`Прогресс раздела ${value}%`} />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function TicketDialog({
  ticket,
  open,
  onOpenChange,
  rating,
  onRate,
}: {
  ticket: Ticket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rating: number;
  onRate: (rating: 1 | 2 | 3) => void;
}) {
  if (!ticket) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="ticket-dialog max-h-[92vh] max-w-5xl overflow-y-auto p-0">
        <div className="ticket-dialog-head">
          <DialogHeader>
            <div className="ticket-dialog-meta">
              <Badge variant="outline">Билет {String(ticket.number).padStart(2, "0")}</Badge>
              <span>{ticket.section}</span>
            </div>
            <DialogTitle>{ticket.title}</DialogTitle>
            <DialogDescription>
              {ticket.source} · {ticket.wordCount.toLocaleString("ru-RU")} слов · ≈ {ticket.estimatedMinutes} мин
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="ticket-dialog-body">
          <Tabs defaultValue="skeleton">
            <TabsList variant="line" className="ticket-tabs">
              <TabsTrigger value="skeleton">Каркас ответа</TabsTrigger>
              <TabsTrigger value="full">Полный конспект</TabsTrigger>
              <TabsTrigger value="oral">План устного ответа</TabsTrigger>
            </TabsList>
            <TabsContent value="skeleton" className="ticket-tab-content">
              <section className="summary-panel">
                <p className="eyebrow">Суть билета</p>
                <p>{ticket.summary}</p>
              </section>
              <section className="key-points-panel">
                <h3>Опорные тезисы</h3>
                <ol>
                  {ticket.keyPoints.map((point, index) => (
                    <li key={`${ticket.id}-point-${index}`}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <p>{point}</p>
                    </li>
                  ))}
                </ol>
              </section>
              <div className="keyword-row">
                {ticket.keywords.map((keyword) => (
                  <span key={keyword}>{keyword}</span>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="full" className="ticket-tab-content answer-prose">
              {ticket.answer.split("\n\n").map((paragraph, index) => (
                <p key={`${ticket.id}-paragraph-${index}`}>{paragraph}</p>
              ))}
            </TabsContent>
            <TabsContent value="oral" className="ticket-tab-content oral-plan-panel">
              <h3>Логика ответа</h3>
              <ol>
                {ticket.oralPlan.map((item, index) => (
                  <li key={`${ticket.id}-oral-${index}`}>
                    <span>{index + 1}</span>
                    {item}
                  </li>
                ))}
              </ol>
              <div className="commission-check">
                <ListChecks />
                <div>
                  <strong>Перед завершением</strong>
                  <p>Свяжи авторов с идеями, приведи исследование или пример и сформулируй вывод.</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        <div className="ticket-dialog-footer">
          <span>Как ощущается билет сейчас?</span>
          <div>
            <Button variant={rating === 1 ? "default" : "outline"} onClick={() => onRate(1)}>
              Трудно
            </Button>
            <Button variant={rating === 2 ? "default" : "outline"} onClick={() => onRate(2)}>
              Повторить
            </Button>
            <Button className="know-button" variant={rating === 3 ? "default" : "outline"} onClick={() => onRate(3)}>
              <Check />
              Знаю
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TicketsView({
  data,
  progress,
  onOpenTicket,
}: {
  data: StudyContent;
  progress: ProgressState;
  onOpenTicket: (ticket: Ticket) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [section, setSection] = React.useState("all");
  const [status, setStatus] = React.useState("all");

  const filtered = React.useMemo(() => {
    const normalized = query.toLowerCase().trim();
    return data.tickets.filter((ticket) => {
      const rating = progress.ratings[ticket.id] ?? 0;
      const matchesQuery =
        !normalized ||
        ticket.title.toLowerCase().includes(normalized) ||
        ticket.summary.toLowerCase().includes(normalized) ||
        ticket.keyPoints.some((point) => point.toLowerCase().includes(normalized)) ||
        ticket.keywords.some((keyword) => keyword.toLowerCase().includes(normalized)) ||
        ticket.answer.toLowerCase().includes(normalized) ||
        String(ticket.number) === normalized;
      const matchesSection = section === "all" || ticket.section === section;
      const matchesStatus =
        status === "all" ||
        (status === "new" && rating === 0) ||
        (status === "learning" && rating > 0 && rating < 3) ||
        (status === "known" && rating === 3);
      return matchesQuery && matchesSection && matchesStatus;
    });
  }, [data.tickets, progress.ratings, query, section, status]);

  return (
    <section>
      <div className="filter-bar">
        <div className="search-field">
          <Search aria-hidden="true" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Номер, тема или ключевое слово"
            aria-label="Поиск по билетам"
          />
        </div>
        <Select value={section} onValueChange={setSection}>
          <SelectTrigger className="filter-select">
            <SelectValue placeholder="Все разделы" />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="all">Все разделы</SelectItem>
            {data.sections.map((item) => (
              <SelectItem key={item.id} value={item.title}>
                {item.number}. {item.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="filter-select status-select">
            <SelectValue placeholder="Любой статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Любой статус</SelectItem>
            <SelectItem value="new">Не начато</SelectItem>
            <SelectItem value="learning">В работе</SelectItem>
            <SelectItem value="known">Знаю</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="result-line">
        <span>{filtered.length} билетов</span>
        <span>Нажми на билет, чтобы открыть каркас и конспект</span>
      </div>

      {filtered.length ? (
        <div className="ticket-list">
          {filtered.map((ticket) => {
            const rating = progress.ratings[ticket.id] ?? 0;
            const sectionIndex = data.sections.findIndex((item) => item.title === ticket.section);
            return (
              <button
                type="button"
                key={ticket.id}
                className="ticket-row"
                onClick={() => onOpenTicket(ticket)}
                style={{ "--ticket-accent": SECTION_ACCENTS[sectionIndex] } as React.CSSProperties}
              >
                <span className="ticket-row-number">{String(ticket.number).padStart(2, "0")}</span>
                <span className="ticket-row-content">
                  <small>{ticket.section}</small>
                  <strong>{ticket.title}</strong>
                  <span className="ticket-row-keywords">
                    {ticket.keywords.slice(0, 4).map((keyword) => (
                      <em key={`${ticket.id}-${keyword}`}>{keyword}</em>
                    ))}
                  </span>
                </span>
                <span className="ticket-row-meta">
                  <span className={`status-pill ${getRatingClass(rating)}`}>{getRatingLabel(rating)}</span>
                  <small>{ticket.estimatedMinutes} мин</small>
                </span>
                <ChevronRight className="ticket-row-arrow" />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <Search />
          <h2>Ничего не нашлось</h2>
          <p>Сбрось фильтры или попробуй более короткий запрос.</p>
          <Button
            variant="outline"
            onClick={() => {
              setQuery("");
              setSection("all");
              setStatus("all");
            }}
          >
            Сбросить фильтры
          </Button>
        </div>
      )}
    </section>
  );
}

function CardsView({
  data,
  progress,
  onRate,
}: {
  data: StudyContent;
  progress: ProgressState;
  onRate: (ticket: Ticket, rating: 1 | 2 | 3) => void;
}) {
  const [section, setSection] = React.useState("all");
  const [index, setIndex] = React.useState(0);
  const [revealed, setRevealed] = React.useState(false);

  const queue = React.useMemo(() => {
    const available = data.tickets.filter((ticket) => section === "all" || ticket.section === section);
    return [...available].sort((a, b) => {
      const ratingA = progress.ratings[a.id] ?? 0;
      const ratingB = progress.ratings[b.id] ?? 0;
      if (ratingA !== ratingB) return ratingA - ratingB;
      return a.number - b.number;
    });
  }, [data.tickets, progress.ratings, section]);

  const changeSection = (value: string) => {
    setSection(value);
    setIndex(0);
    setRevealed(false);
  };

  const ticket = queue[index % Math.max(1, queue.length)];
  const next = React.useCallback(() => {
    setIndex((current) => (current + 1) % Math.max(1, queue.length));
    setRevealed(false);
  }, [queue.length]);

  const rateCurrent = React.useCallback(
    (rating: 1 | 2 | 3) => {
      if (!ticket) return;
      const previousRating = progress.ratings[ticket.id] ?? 0;
      onRate(ticket, rating);
      if (rating <= previousRating) {
        setIndex((current) => (current + 1) % Math.max(1, queue.length));
      }
      setRevealed(false);
    },
    [onRate, progress.ratings, queue.length, ticket],
  );

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" && !(event.target instanceof HTMLInputElement)) {
        event.preventDefault();
        setRevealed((value) => !value);
      }
      if (!revealed || !ticket) return;
      if (["Digit1", "Digit2", "Digit3"].includes(event.code)) {
        const rating = Number(event.code.slice(-1)) as 1 | 2 | 3;
        rateCurrent(rating);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [rateCurrent, revealed, ticket]);

  if (!ticket) return null;
  const completed = queue.filter((item) => progress.ratings[item.id] === 3).length;

  return (
    <section className="cards-layout">
      <aside className="study-control-card">
        <p className="eyebrow">Колода</p>
        <h2>{queue.length} карточек</h2>
        <Select value={section} onValueChange={changeSection}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="all">Вся программа</SelectItem>
            {data.sections.map((item) => (
              <SelectItem value={item.title} key={item.id}>
                {item.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="deck-progress">
          <div>
            <span>Освоено</span>
            <strong>
              {completed}/{queue.length}
            </strong>
          </div>
          <Progress value={(completed / queue.length) * 100} />
        </div>
        <div className="keyboard-hint">
          <span>Пробел</span> открыть · <span>1–3</span> оценить
        </div>
      </aside>

      <div className="flashcard-stage">
        <div className={`flashcard ${revealed ? "is-revealed" : ""}`}>
          <div className="flashcard-topline">
            <span>Билет {String(ticket.number).padStart(2, "0")}</span>
            <Badge variant="outline">{ticket.difficulty}</Badge>
          </div>
          {!revealed ? (
            <div className="flashcard-front">
              <p>{ticket.section}</p>
              <h2>{ticket.title}</h2>
              <div className="recall-prompt">
                <Brain />
                <span>Назови определение, 3–5 ключевых тезисов, авторов и один пример.</span>
              </div>
            </div>
          ) : (
            <div className="flashcard-back">
              <p className="flashcard-summary">{ticket.summary}</p>
              <ol>
                {ticket.keyPoints.slice(0, 5).map((point, pointIndex) => (
                  <li key={`${ticket.id}-card-${pointIndex}`}>
                    <span>{pointIndex + 1}</span>
                    {point}
                  </li>
                ))}
              </ol>
            </div>
          )}
          <div className="flashcard-footer">
            {!revealed ? (
              <Button className="action-primary" onClick={() => setRevealed(true)}>
                Показать опоры
              </Button>
            ) : (
              <div className="rating-buttons">
                <Button
                  variant="outline"
                  onClick={() => rateCurrent(1)}
                >
                  <span>1</span> Трудно
                </Button>
                <Button
                  variant="outline"
                  onClick={() => rateCurrent(2)}
                >
                  <span>2</span> Повторить
                </Button>
                <Button
                  className="know-button"
                  onClick={() => rateCurrent(3)}
                >
                  <span>3</span> Знаю
                </Button>
              </div>
            )}
            <Button variant="ghost" size="icon" onClick={next} aria-label="Следующая карточка">
              <ChevronRight />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function QuizView({
  data,
  bank,
  progress,
  onAnswer,
}: {
  data: StudyContent;
  bank: AdvancedQuizBank;
  progress: ProgressState;
  onAnswer: (correct: boolean) => void;
}) {
  const [section, setSection] = React.useState("all");
  const [questionIndex, setQuestionIndex] = React.useState(0);
  const [selected, setSelected] = React.useState<QuizOption["id"] | null>(null);
  const [showHint, setShowHint] = React.useState(false);
  const [sessionCorrect, setSessionCorrect] = React.useState(0);
  const [sessionAnswered, setSessionAnswered] = React.useState(0);

  const questionPool = React.useMemo(
    () => bank.questions.filter((question) => section === "all" || question.section === section),
    [bank.questions, section],
  );
  const question = questionPool[questionIndex % Math.max(1, questionPool.length)] ?? bank.questions[0];
  if (!question) {
    return (
      <div className="empty-state">
        <AlertTriangle />
        <h2>Банк заданий пуст</h2>
        <p>Проверь файл экспертных вопросов и обнови страницу.</p>
      </div>
    );
  }
  const answered = selected !== null;
  const selectedCorrect = selected === question.correctId;
  const selectedOption = question.options.find((option) => option.id === selected);

  const choose = (id: QuizOption["id"]) => {
    if (answered) return;
    setSelected(id);
    const correct = id === question.correctId;
    setSessionAnswered((value) => value + 1);
    if (correct) setSessionCorrect((value) => value + 1);
    onAnswer(correct);
  };

  const next = () => {
    setQuestionIndex((value) => (value + 1) % Math.max(1, questionPool.length));
    setSelected(null);
    setShowHint(false);
  };

  const changeSection = (value: string) => {
    setSection(value);
    setQuestionIndex(0);
    setSelected(null);
    setShowHint(false);
    setSessionAnswered(0);
    setSessionCorrect(0);
  };

  return (
    <section className="quiz-layout">
      <aside className="study-control-card quiz-sidebar">
        <p className="eyebrow">Экспертная сессия</p>
        <h2>{sessionAnswered ? `${sessionCorrect}/${sessionAnswered}` : "Начинаем"}</h2>
        <p>Один лучший ответ из четырёх правдоподобных. После выбора разбираются все альтернативы.</p>
        <Select value={section} onValueChange={changeSection}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="all">Вся программа</SelectItem>
            {data.sections.map((item) => (
              <SelectItem value={item.title} key={item.id}>
                {item.number}. {item.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="quiz-session-progress">
          <div>
            <span>Пройдено в разделе</span>
            <strong>{Math.min(sessionAnswered, questionPool.length)}/{questionPool.length}</strong>
          </div>
          <Progress value={questionPool.length ? (Math.min(sessionAnswered, questionPool.length) / questionPool.length) * 100 : 0} />
        </div>
        <div className="lifetime-score">
          <Trophy />
          <div>
            <span>За всё время</span>
            <strong>
              {progress.quizCorrect}/{progress.quizAnswered}
            </strong>
          </div>
        </div>
      </aside>

      <article className="quiz-card">
        <div className="quiz-card-head">
          <span>Задание {questionIndex + 1} из {questionPool.length}</span>
          <div className="quiz-badges">
            <Badge variant="outline">{question.difficulty}</Badge>
            <Badge variant="outline">Билет {question.ticketNumber}</Badge>
          </div>
        </div>
        <div className="quiz-taxonomy">
          <span>{question.kind}</span>
          <span>{question.section}</span>
        </div>
        {question.context ? <p className="quiz-context">{question.context}</p> : null}
        <h2 className="quiz-question">{question.question}</h2>
        <div className="quiz-options" role="group" aria-label="Варианты ответа">
          {question.options.map((option) => {
            const isCorrect = option.id === question.correctId;
            const isSelected = selected === option.id;
            const stateClass = answered
              ? isCorrect
                ? "is-correct"
                : isSelected
                  ? "is-wrong"
                  : "is-neutral"
              : "";
            return (
              <button
                type="button"
                key={option.id}
                className={`quiz-option ${stateClass}`}
                onClick={() => choose(option.id)}
                disabled={answered}
                aria-pressed={isSelected}
              >
                <span>{option.id}</span>
                <span className="quiz-option-copy">
                  <strong>{option.text}</strong>
                  {answered ? <small>{option.feedback}</small> : null}
                </span>
                {answered && isCorrect ? <CheckCircle2 /> : null}
              </button>
            );
          })}
        </div>
        {!answered ? (
          <div className="quiz-hint-wrap">
            <Button variant="ghost" onClick={() => setShowHint((value) => !value)}>
              <Info />
              {showHint ? "Скрыть ориентир" : "Нужен ориентир"}
            </Button>
            {showHint ? <p>{question.hint}</p> : null}
          </div>
        ) : null}
        {answered ? (
          <div className="quiz-resolution" aria-live="polite">
            <div className={`quiz-feedback ${selectedCorrect ? "feedback-correct" : "feedback-wrong"}`}>
              <div>
                {selectedCorrect ? <CheckCircle2 /> : <AlertTriangle />}
                <div>
                  <strong>{selectedCorrect ? "Точный выбор" : "Ответ требует пересборки"}</strong>
                  <p>{selectedOption?.feedback}</p>
                </div>
              </div>
              <Button onClick={next}>
                Следующее задание
                <ArrowRight />
              </Button>
            </div>
            <div className="quiz-explanation">
              <p className="eyebrow">Разбор</p>
              <p>{question.explanation}</p>
              <div className="quiz-sources" aria-label="Источники задания">
                {question.sources.map((source) => (
                  <span key={`${question.id}-${source}`}>{source}</span>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </article>
    </section>
  );
}

function CasesView({
  data,
  progress,
  onToggleSolved,
}: {
  data: StudyContent;
  progress: ProgressState;
  onToggleSolved: (caseId: string) => void;
}) {
  const [selectedNumber, setSelectedNumber] = React.useState(1);
  const selectedCase = data.cases.find((item) => item.number === selectedNumber) ?? data.cases[0];
  const selectedIndex = data.cases.findIndex((item) => item.id === selectedCase.id);
  const solved = progress.solvedCases.includes(selectedCase.id);

  const moveCase = (offset: number) => {
    const nextCase = data.cases[selectedIndex + offset];
    if (nextCase) setSelectedNumber(nextCase.number);
  };

  return (
    <section className="cases-layout">
      <aside className="case-index">
        <div className="case-index-head">
          <span>Разобрано</span>
          <strong>
            {progress.solvedCases.length}/{data.cases.length}
          </strong>
        </div>
        <Progress value={(progress.solvedCases.length / data.cases.length) * 100} />
        <div className="case-index-scroll">
          {data.cases.map((item) => (
            <button
              type="button"
              key={item.id}
              className={item.number === selectedCase.number ? "is-active" : ""}
              onClick={() => setSelectedNumber(item.number)}
            >
              <span>{String(item.number).padStart(2, "0")}</span>
              <strong>{item.title}</strong>
              {progress.solvedCases.includes(item.id) ? <CheckCircle2 /> : null}
            </button>
          ))}
        </div>
      </aside>

      <article className="case-workspace">
        <div className="case-mobile-select" role="group" aria-label="Навигация по кейсам">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="case-step-button"
            onClick={() => moveCase(-1)}
            disabled={selectedIndex <= 0}
            aria-label="Предыдущий кейс"
          >
            <ChevronLeft />
          </Button>
          <Select value={String(selectedNumber)} onValueChange={(value) => setSelectedNumber(Number(value))}>
            <SelectTrigger className="case-select-trigger" aria-label="Выбрать кейс">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="center" className="case-select-content">
              {data.cases.map((item) => (
                <SelectItem key={item.id} value={String(item.number)}>
                  {item.number}. {item.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="case-step-button"
            onClick={() => moveCase(1)}
            disabled={selectedIndex >= data.cases.length - 1}
            aria-label="Следующий кейс"
          >
            <ChevronRight />
          </Button>
        </div>
        <div className="case-title-row">
          <div>
            <p className="eyebrow">Кейс {String(selectedCase.number).padStart(2, "0")}</p>
            <h2>{selectedCase.title}</h2>
          </div>
          <Button
            variant={solved ? "default" : "outline"}
            className={solved ? "know-button" : ""}
            onClick={() => onToggleSolved(selectedCase.id)}
          >
            <CheckCircle2 />
            {solved ? "Разобрано" : "Отметить разбор"}
          </Button>
        </div>

        <div className="case-prompt">
          {selectedCase.prompt.split("\n\n").map((paragraph, index) => (
            <p key={`${selectedCase.id}-prompt-${index}`}>{paragraph}</p>
          ))}
        </div>

        <section className="case-rubric">
          <div className="case-section-title">
            <ListChecks />
            <div>
              <h3>Алгоритм разбора</h3>
              <p>Собери свой ответ до открытия архивного решения.</p>
            </div>
          </div>
          <ol>
            {selectedCase.rubric.map((item, index) => (
              <li key={`${selectedCase.id}-rubric-${index}`}>
                <span>{index + 1}</span>
                {item}
              </li>
            ))}
          </ol>
        </section>

        <Accordion type="single" collapsible className="case-accordion">
          <AccordionItem value="archive">
            <AccordionTrigger>Архивный вариант решения</AccordionTrigger>
            <AccordionContent>
              <div className="archive-warning">
                <AlertTriangle />
                <p>
                  Это материал исходного сборника, а не единственно верный ответ. Проверяй логику, этику и актуальность методов.
                </p>
              </div>
              <div className="archive-solution answer-prose">
                {selectedCase.archiveSolution.split("\n\n").map((paragraph, index) => (
                  <p key={`${selectedCase.id}-solution-${index}`}>{paragraph}</p>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="risks">
            <AccordionTrigger>Что критически проверить</AccordionTrigger>
            <AccordionContent>
              <ul className="risk-list">
                {selectedCase.redFlags.map((flag) => (
                  <li key={flag}>
                    <AlertTriangle />
                    {flag}
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </article>
    </section>
  );
}

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function OralView({
  data,
  progress,
  onRate,
  onOpenTicket,
}: {
  data: StudyContent;
  progress: ProgressState;
  onRate: (ticket: Ticket, rating: 1 | 2 | 3) => void;
  onOpenTicket: (ticket: Ticket) => void;
}) {
  const [ticketIndex, setTicketIndex] = React.useState(0);
  const [duration, setDuration] = React.useState(180);
  const [secondsLeft, setSecondsLeft] = React.useState(180);
  const [running, setRunning] = React.useState(false);
  const [showPlan, setShowPlan] = React.useState(false);
  const [checks, setChecks] = React.useState<boolean[]>([false, false, false, false]);
  const ticket = data.tickets[ticketIndex];
  const activelyRunning = running && secondsLeft > 0;

  React.useEffect(() => {
    if (!activelyRunning) return;
    const interval = window.setInterval(() => setSecondsLeft((value) => value - 1), 1000);
    return () => window.clearInterval(interval);
  }, [activelyRunning]);

  const resetTimer = (nextDuration = duration) => {
    setRunning(false);
    setSecondsLeft(nextDuration);
  };

  const randomize = () => {
    let nextIndex = Math.floor(Math.random() * data.tickets.length);
    if (nextIndex === ticketIndex) nextIndex = (nextIndex + 1) % data.tickets.length;
    setTicketIndex(nextIndex);
    setShowPlan(false);
    setChecks([false, false, false, false]);
    resetTimer();
  };

  const checklist = [
    "Дал определение и очертил предмет",
    "Назвал авторов, подходы или классификации",
    "Привёл исследование, механизм или пример",
    "Сделал вывод и связал тему с практикой",
  ];

  const completion = checks.filter(Boolean).length;
  const rating = progress.ratings[ticket.id] ?? 0;

  return (
    <section className="oral-layout">
      <article className="oral-stage">
        <div className="oral-stage-head">
          <div>
            <p className="eyebrow">Случайный билет</p>
            <span>{ticket.section}</span>
          </div>
          <div className="oral-stage-actions">
            <Button variant="outline" onClick={() => onOpenTicket(ticket)}>
              <BookOpen />
              Открыть конспект
            </Button>
            <Button variant="outline" onClick={randomize}>
              <Shuffle />
              Другой билет
            </Button>
          </div>
        </div>
        <div className="oral-ticket-number">{String(ticket.number).padStart(2, "0")}</div>
        <h2>{ticket.title}</h2>
        <div className="timer-panel">
          <div className={`timer-digits ${secondsLeft === 0 ? "is-finished" : ""}`}>{formatTimer(secondsLeft)}</div>
          <div className="timer-presets" role="group" aria-label="Продолжительность ответа">
            {[90, 180, 300].map((value) => (
              <button
                type="button"
                className={duration === value ? "is-active" : ""}
                key={value}
                onClick={() => {
                  setDuration(value);
                  resetTimer(value);
                }}
              >
                {value / 60 === 1.5 ? "1:30" : `${value / 60}:00`}
              </button>
            ))}
          </div>
          <div className="timer-actions">
            <Button
              className="action-primary timer-main-button"
              onClick={() => setRunning((value) => !value)}
              disabled={secondsLeft === 0}
            >
              {activelyRunning ? <Pause /> : <Play />}
              {activelyRunning
                ? "Пауза"
                : secondsLeft === 0
                  ? "Время вышло"
                  : secondsLeft === duration
                    ? "Начать ответ"
                    : "Продолжить"}
            </Button>
            <Button variant="outline" size="icon" onClick={() => resetTimer()} aria-label="Сбросить таймер">
              <RotateCcw />
            </Button>
          </div>
        </div>
        <button className="plan-reveal" type="button" onClick={() => setShowPlan((value) => !value)}>
          <ListChecks />
          <span>{showPlan ? "Скрыть план" : "Показать план после ответа"}</span>
          <ChevronRight className={showPlan ? "is-open" : ""} />
        </button>
        {showPlan ? (
          <ol className="oral-plan-list">
            {ticket.oralPlan.map((item, index) => (
              <li key={`${ticket.id}-rehearsal-${index}`}>
                <span>{index + 1}</span>
                {item}
              </li>
            ))}
          </ol>
        ) : null}
      </article>

      <aside className="oral-review">
        <div>
          <p className="eyebrow">Самопроверка</p>
          <h2>{completion}/4 пункта</h2>
          <Progress value={completion * 25} />
        </div>
        <div className="oral-checklist">
          {checklist.map((item, index) => (
            <button
              type="button"
              key={item}
              className={checks[index] ? "is-checked" : ""}
              onClick={() =>
                setChecks((current) => current.map((value, itemIndex) => (itemIndex === index ? !value : value)))
              }
            >
              <span>{checks[index] ? <Check /> : null}</span>
              {item}
            </button>
          ))}
        </div>
        <div className="oral-rating">
          <span>Итоговая оценка</span>
          <div>
            <Button variant={rating === 1 ? "default" : "outline"} onClick={() => onRate(ticket, 1)}>
              Трудно
            </Button>
            <Button variant={rating === 2 ? "default" : "outline"} onClick={() => onRate(ticket, 2)}>
              Повторить
            </Button>
            <Button className="know-button" variant={rating === 3 ? "default" : "outline"} onClick={() => onRate(ticket, 3)}>
              Знаю
            </Button>
          </div>
        </div>
      </aside>
    </section>
  );
}

function SourcesView({ data, audit }: { data: StudyContent; audit: SourceAudit | null }) {
  if (!audit) {
    return (
      <div className="empty-state">
        <RefreshCw className="animate-spin" />
        <h2>Загружаем аудит источников</h2>
      </div>
    );
  }
  return (
    <section className="sources-stack">
      <div className="science-notice">
        <FlaskConical />
        <div>
          <h2>Первоисточники стали основной учебной базой</h2>
          <p>
            Корпус из {data.meta.ticketCount} билетов дополнен 20 книгами и хрестоматиями. Сложные задания
            опираются на извлекаемые тексты; визуальные сканы вынесены в отдельный статус ручной проверки.
          </p>
        </div>
      </div>

      <div className="audit-grid">
        {audit.checks.map((check) => (
          <article className={`audit-card severity-${check.severity}`} key={check.check}>
            {check.severity === "ok" ? <CheckCircle2 /> : <AlertTriangle />}
            <div>
              <h3>{check.check}</h3>
              <p>{check.result}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="source-table-wrap">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Учебная база</p>
            <h2>Роль каждого источника</h2>
          </div>
        </div>
        <div className="source-table" role="table" aria-label="Источники тренажёра">
          <div className="source-table-row source-table-head" role="row">
            <span role="columnheader">Файл</span>
            <span role="columnheader">Роль</span>
            <span role="columnheader">Статус</span>
          </div>
          {audit.sources.map((source) => (
            <div className="source-table-row" role="row" key={source.name}>
              <strong role="cell">{source.name}</strong>
              <span role="cell">{source.role}</span>
              <Badge variant="outline" role="cell">
                {source.decision}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      <div className="risk-panel">
        <div className="case-section-title">
          <Info />
          <div>
            <h3>Ограничения</h3>
            <p>Их лучше помнить до экзамена, а не обнаруживать на нём.</p>
          </div>
        </div>
        <ul>
          {audit.openRisks.map((risk) => (
            <li key={risk}>{risk}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function ExamTrainer() {
  const [data, setData] = React.useState<StudyContent | null>(null);
  const [audit, setAudit] = React.useState<SourceAudit | null>(null);
  const [quizBank, setQuizBank] = React.useState<AdvancedQuizBank | null>(null);
  const [loadError, setLoadError] = React.useState(false);
  const [mode, setMode] = React.useState<Mode>("overview");
  const progressSnapshot = React.useSyncExternalStore(
    subscribeToProgress,
    getProgressSnapshot,
    () => "",
  );
  const progress = React.useMemo(
    () => parseProgressSnapshot(progressSnapshot),
    [progressSnapshot],
  );
  const [selectedTicket, setSelectedTicket] = React.useState<Ticket | null>(null);
  const progressRef = React.useRef(progress);
  const dataRef = React.useRef(data);

  const changeMode = React.useCallback((nextMode: Mode) => {
    setMode(nextMode);
  }, []);

  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [mode]);

  React.useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/data/study-content.json").then((response) => {
        if (!response.ok) throw new Error("content");
        return response.json() as Promise<StudyContent>;
      }),
      fetch("/data/source-audit.json").then((response) => {
        if (!response.ok) throw new Error("audit");
        return response.json() as Promise<SourceAudit>;
      }),
      fetch("/data/advanced-quiz.json").then((response) => {
        if (!response.ok) throw new Error("quiz");
        return response.json() as Promise<AdvancedQuizBank>;
      }),
    ])
      .then(([content, sourceAudit, advancedQuiz]) => {
        if (!active) return;
        setData(content);
        setAudit(sourceAudit);
        setQuizBank(advancedQuiz);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  React.useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const saveProgress = React.useCallback((updater: (current: ProgressState) => ProgressState) => {
    const current = parseProgressSnapshot(window.localStorage.getItem(STORAGE_KEY));
    const next = updater(current);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(PROGRESS_EVENT));
  }, []);

  const rateTicket = React.useCallback(
    (ticket: Ticket, rating: 1 | 2 | 3) => {
      saveProgress((current) => ({
        ...current,
        ratings: { ...current.ratings, [ticket.id]: rating },
        studyDays: markStudyDay(current),
      }));
    },
    [saveProgress],
  );

  const toggleSolvedCase = React.useCallback(
    (caseId: string) => {
      saveProgress((current) => {
        const solved = current.solvedCases.includes(caseId);
        return {
          ...current,
          solvedCases: solved
            ? current.solvedCases.filter((id) => id !== caseId)
            : [...current.solvedCases, caseId],
          studyDays: markStudyDay(current),
        };
      });
    },
    [saveProgress],
  );

  const recordQuizAnswer = React.useCallback(
    (correct: boolean) => {
      saveProgress((current) => ({
        ...current,
        quizCorrect: current.quizCorrect + (correct ? 1 : 0),
        quizAnswered: current.quizAnswered + 1,
        studyDays: markStudyDay(current),
      }));
    },
    [saveProgress],
  );

  React.useEffect(() => {
    if (!data) return;
    const documentWithContext = document as Document & {
      modelContext?: {
        registerTool: (
          tool: {
            name: string;
            title: string;
            description: string;
            inputSchema: Record<string, unknown>;
            annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
            execute: (input: unknown) => unknown | Promise<unknown>;
          },
          options?: { signal?: AbortSignal },
        ) => void | Promise<void>;
      };
    };
    const context = documentWithContext.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();

    const register = async () => {
      await context.registerTool(
        {
          name: "open_exam_ticket",
          title: "Открыть экзаменационный билет",
          description: "Открывает на экране билет по его номеру, включая каркас ответа и полный конспект.",
          inputSchema: {
            type: "object",
            properties: { number: { type: "integer", minimum: 1, maximum: 70 } },
            required: ["number"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute(input) {
            const number = Number((input as { number?: unknown })?.number);
            const ticket = dataRef.current?.tickets.find((item) => item.number === number);
            if (!ticket) throw new Error("Билет с таким номером не найден");
            changeMode("tickets");
            setSelectedTicket(ticket);
            return { opened: true, number: ticket.number, title: ticket.title };
          },
        },
        { signal: lifecycle.signal },
      );
      await context.registerTool(
        {
          name: "get_exam_progress",
          title: "Получить прогресс подготовки",
          description: "Возвращает количество изученных билетов, разобранных кейсов и точность теста.",
          inputSchema: { type: "object", properties: {}, additionalProperties: false },
          annotations: { readOnlyHint: true, untrustedContentHint: false },
          execute() {
            const current = progressRef.current;
            return {
              knownTickets: Object.values(current.ratings).filter((rating) => rating === 3).length,
              learningTickets: Object.values(current.ratings).filter((rating) => rating > 0 && rating < 3).length,
              solvedCases: current.solvedCases.length,
              quizAccuracy: current.quizAnswered
                ? Math.round((current.quizCorrect / current.quizAnswered) * 100)
                : null,
            };
          },
        },
        { signal: lifecycle.signal },
      );
    };
    void register().catch(() => undefined);
    return () => lifecycle.abort();
  }, [changeMode, data]);

  const knownCount = data
    ? data.tickets.filter((ticket) => progress.ratings[ticket.id] === 3).length
    : 0;
  const dueCount = data
    ? data.tickets.filter((ticket) => (progress.ratings[ticket.id] ?? 0) < 3).length
    : 0;
  const progressPercent = data ? Math.round((knownCount / data.tickets.length) * 100) : 0;

  if (loadError) {
    return (
      <main className="fatal-state">
        <AlertTriangle />
        <h1>Материалы не загрузились</h1>
        <p>Обнови страницу. Если ошибка повторится, проверь доступность файла учебного корпуса.</p>
        <Button onClick={() => window.location.reload()}>
          <RefreshCw />
          Обновить
        </Button>
      </main>
    );
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="sidebar" collapsible="icon" className="app-sidebar">
        <TrainerNavigation
          mode={mode}
          onModeChange={changeMode}
          counts={{ due: dueCount, cases: data ? data.cases.length - progress.solvedCases.length : 0 }}
        />
      </Sidebar>
      <SidebarInset className="app-main">
        <div className="mobile-topbar">
          <SidebarTrigger className="mobile-menu-button" />
          <button type="button" className="mobile-brand" onClick={() => changeMode("overview")} aria-label="На главную">
            <span className="mobile-brand-mark">Э</span>
            <span className="mobile-brand-name">Экзаменариум</span>
          </button>
          <div className="mobile-progress">{progressPercent}%</div>
        </div>
        <div className="app-content">
          {!data ? (
            <LoadingScreen />
          ) : (
            <>
              <PageHeading mode={mode} />
              {mode === "overview" ? (
                <Overview
                  data={data}
                  progress={progress}
                  onModeChange={changeMode}
                  onOpenTicket={setSelectedTicket}
                />
              ) : null}
              {mode === "tickets" ? (
                <TicketsView data={data} progress={progress} onOpenTicket={setSelectedTicket} />
              ) : null}
              {mode === "cards" ? (
                <CardsView data={data} progress={progress} onRate={rateTicket} />
              ) : null}
              {mode === "quiz" ? (
                quizBank ? (
                  <QuizView data={data} bank={quizBank} progress={progress} onAnswer={recordQuizAnswer} />
                ) : (
                  <LoadingScreen />
                )
              ) : null}
              {mode === "cases" ? (
                <CasesView data={data} progress={progress} onToggleSolved={toggleSolvedCase} />
              ) : null}
              {mode === "oral" ? (
                <OralView
                  data={data}
                  progress={progress}
                  onRate={rateTicket}
                  onOpenTicket={setSelectedTicket}
                />
              ) : null}
              {mode === "sources" ? <SourcesView data={data} audit={audit} /> : null}
            </>
          )}
        </div>
        {data ? (
          <nav className="mobile-bottom-nav" aria-label="Основная навигация">
            {MOBILE_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  type="button"
                  key={item.id}
                  className={mode === item.id ? "is-active" : ""}
                  onClick={() => changeMode(item.id)}
                >
                  <Icon />
                  <span>{item.shortLabel}</span>
                </button>
              );
            })}
          </nav>
        ) : null}
      </SidebarInset>

      <TicketDialog
        ticket={selectedTicket}
        open={Boolean(selectedTicket)}
        onOpenChange={(open) => {
          if (!open) setSelectedTicket(null);
        }}
        rating={selectedTicket ? progress.ratings[selectedTicket.id] ?? 0 : 0}
        onRate={(rating) => {
          if (selectedTicket) rateTicket(selectedTicket, rating);
        }}
      />
    </SidebarProvider>
  );
}
