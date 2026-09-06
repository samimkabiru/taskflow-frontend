"use client";

import * as React from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { cn } from "@/lib/utils";

function TooltipProvider({
  delay = 120,
  closeDelay = 0,
  children,
  ...props
}: TooltipPrimitive.Provider.Props) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delay={delay}
      closeDelay={closeDelay}
      {...props}
    >
      {children}
    </TooltipPrimitive.Provider>
  );
}

function Tooltip({ ...props }: TooltipPrimitive.Root.Props) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  );
}

function TooltipTrigger({ ...props }: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  side = "top",
  sideOffset = 6,
  align = "center",
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<TooltipPrimitive.Positioner.Props, "side" | "sideOffset" | "align">) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        className="isolate z-50 pointer-events-none"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            "z-50 overflow-hidden rounded-lg bg-on-surface text-surface px-2.5 py-1 text-[11px] font-medium font-[family-name:var(--font-body)] tracking-wide shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            className
          )}
          {...props}
        >
          {children}
          <TooltipPrimitive.Arrow className="fill-on-surface z-50 size-2" />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

/**
 * Convenient quick wrapper component:
 * <SimpleTooltip content="Design Label">
 *    <span className="w-2 h-2 rounded-full" />
 * </SimpleTooltip>
 */
interface SimpleTooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: "top" | "bottom" | "left" | "right";
  sideOffset?: number;
  align?: "center" | "start" | "end";
  className?: string;
}

export function SimpleTooltip({
  content,
  children,
  side = "top",
  sideOffset = 6,
  align = "center",
  className,
}: SimpleTooltipProps) {
  if (!content) return children;

  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side={side} sideOffset={sideOffset} align={align} className={className}>
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
};
