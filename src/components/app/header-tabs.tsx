import { Presentation, Tag, Users } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';

const NAV_ITEMS = [
  { href: '/meetings', label: '회의록', icon: Presentation },
  { href: '/tickets', label: '티켓', icon: Tag },
  { href: '/organization', label: '조직도', icon: Users }
] as const;

type HeaderTabsProps = {
  currentPath: string;
};

function resolveActiveTab(currentPath: string) {
  const matched = NAV_ITEMS.find((item) => currentPath === item.href || currentPath.startsWith(`${item.href}/`));
  return matched?.href ?? '/meetings';
}

export function HeaderTabs({ currentPath }: HeaderTabsProps) {
  const activeTab = resolveActiveTab(currentPath);

  return (
    <Tabs value={activeTab} className="w-full sm:w-auto">
      <TabsList className="h-auto w-full justify-between gap-1 overflow-x-auto rounded-2xl border border-border bg-muted/40 p-1 sm:w-auto sm:justify-start">
        {NAV_ITEMS.map((item) => (
          <TabsTrigger key={item.href} value={item.href} asChild className="flex-1 rounded-xl px-3 py-2 text-sm sm:flex-none sm:px-4">
            <a href={item.href} className="inline-flex items-center gap-1.5"><item.icon aria-hidden="true" className="h-4 w-4" />{item.label}</a>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
