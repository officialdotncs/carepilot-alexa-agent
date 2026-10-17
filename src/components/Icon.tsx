import {
  Activity,
  AlertTriangle,
  Bell,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  Heart,
  Home,
  LayoutDashboard,
  ListTodo,
  Lock,
  MapPin,
  MessageSquare,
  Phone,
  Pill,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  User,
  UserCog,
  X,
  CircleDot,
  Loader2,
  PauseCircle,
  XCircle,
  Send,
  Terminal,
  Wand2,
  type LucideProps,
} from 'lucide-react';
import type { ComponentType } from 'react';

// Central registry so views can render icons by name without importing everywhere.
const icons: Record<string, ComponentType<LucideProps>> = {
  activity: Activity,
  alert: AlertTriangle,
  bell: Bell,
  calendar: Calendar,
  calendarClock: CalendarClock,
  check: Check,
  checkCircle: CheckCircle2,
  chevronRight: ChevronRight,
  clock: Clock,
  creditCard: CreditCard,
  fileText: FileText,
  heart: Heart,
  home: Home,
  dashboard: LayoutDashboard,
  tasks: ListTodo,
  lock: Lock,
  mapPin: MapPin,
  message: MessageSquare,
  phone: Phone,
  pill: Pill,
  settings: Settings,
  shield: Shield,
  shieldCheck: ShieldCheck,
  sparkles: Sparkles,
  stethoscope: Stethoscope,
  user: User,
  userCog: UserCog,
  x: X,
  dot: CircleDot,
  loader: Loader2,
  pause: PauseCircle,
  xCircle: XCircle,
  send: Send,
  terminal: Terminal,
  wand: Wand2,
};

export type IconName = keyof typeof icons;

export function Icon({
  name,
  className,
  size = 18,
}: {
  name: IconName;
  className?: string;
  size?: number;
}) {
  const Cmp = icons[name] ?? CircleDot;
  return <Cmp className={className} size={size} aria-hidden="true" />;
}
