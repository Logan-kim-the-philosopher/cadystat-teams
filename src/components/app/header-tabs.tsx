import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';

const NAV_ITEMS = [
  { href: '/', label: '대시보드' },
  { href: '/organization', label: '조직도' },
  { href: '/tickets', label: '티켓' },
  { href: '/meetings', label: '회의록' }
] as const;

type HeaderTabsProps = {
  currentPath: string;
};

function resolveActiveTab(currentPath: string) {
  const matched = NAV_ITEMS.find((item) => currentPath === item.href || currentPath.startsWith(`${item.href}/`));
  return matched?.href ?? '/';
}

export function HeaderTabs({ currentPath }: HeaderTabsProps) {
  const activeTab = resolveActiveTab(currentPath);

  return (
    <Tabs value={activeTab} className="w-full">
      <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl border border-border bg-muted/40 p-1">
        {NAV_ITEMS.map((item) => (
          <TabsTrigger key={item.href} value={item.href} asChild className="rounded-xl px-4 py-2 text-sm">
            <a href={item.href}>{item.label}</a>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
