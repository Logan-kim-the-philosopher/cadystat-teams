import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';

export function Calendar(props: React.ComponentProps<typeof DayPicker>) {
  return <DayPicker {...props} style={{ '--rdp-accent-color': 'hsl(var(--muted-foreground))', ...props.style } as React.CSSProperties} className="rounded-md border p-3" classNames={{ selected: 'bg-primary text-primary-foreground rounded-md', today: 'font-bold text-primary', button_previous: 'text-muted-foreground hover:bg-muted hover:text-foreground', button_next: 'text-muted-foreground hover:bg-muted hover:text-foreground', ...props.classNames }} />;
}
