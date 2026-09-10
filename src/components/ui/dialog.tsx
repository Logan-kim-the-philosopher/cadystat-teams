import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '../../lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

export function DialogContent({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-black/40 [will-change:opacity]" />
      <DialogPrimitive.Content {...props} className={cn('fixed left-1/2 top-1/2 z-[101] max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-hidden overscroll-contain rounded-2xl [will-change:transform] bg-white p-6 shadow-2xl', className)} />
    </DialogPrimitive.Portal>
  );
}
