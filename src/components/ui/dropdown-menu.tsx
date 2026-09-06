"use client"

import * as React from "react"
import { Menu as MenuPrimitive } from "@base-ui/react/menu"

import { cn } from "@/lib/utils"
import { ChevronRightIcon, CheckIcon } from "lucide-react"

function DropdownMenu({ ...props }: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuPortal({ ...props }: MenuPrimitive.Portal.Props) {
  return <MenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
}

function DropdownMenuTrigger({ ...props }: MenuPrimitive.Trigger.Props) {
  return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />
}

function DropdownMenuContent({
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 6,
  className,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<
    MenuPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="isolate z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={cn(
            "z-50 max-h-[min(560px,calc(100vh-4.5rem))] min-w-36 overflow-x-hidden overflow-y-auto custom-scrollbar rounded-xl bg-surface p-1.5 text-on-surface shadow-xl border border-outline-variant/50 duration-100 outline-none animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            className
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

function DropdownMenuGroup({ ...props }: MenuPrimitive.Group.Props) {
  return <MenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: MenuPrimitive.GroupLabel.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        "px-2.5 py-1 text-[10.5px] font-semibold text-outline uppercase tracking-wider font-[family-name:var(--font-mono)] data-inset:pl-7",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: MenuPrimitive.Item.Props & {
  inset?: boolean
  variant?: "default" | "destructive"
}) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "group/dropdown-menu-item relative flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] font-medium font-[family-name:var(--font-body)] outline-none select-none transition-colors",
        "text-on-surface hover:bg-black/6 data-[highlighted]:bg-black/6 focus:bg-black/6 dark:hover:bg-white/10 dark:data-[highlighted]:bg-white/10 dark:focus:bg-white/10",
        "data-inset:pl-7",
        "data-[variant=destructive]:text-error data-[variant=destructive]:hover:bg-error-container/30 data-[variant=destructive]:data-[highlighted]:bg-error-container/30 data-[variant=destructive]:focus:bg-error-container/30 dark:data-[variant=destructive]:hover:bg-error-container/30 dark:data-[variant=destructive]:data-[highlighted]:bg-error-container/30 dark:data-[variant=destructive]:focus:bg-error-container/30 data-[variant=destructive]:hover:text-error data-[variant=destructive]:data-[highlighted]:text-error",
        "data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[variant=destructive]:*:[svg]:text-error",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSub({ ...props }: MenuPrimitive.SubmenuRoot.Props) {
  return <MenuPrimitive.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: MenuPrimitive.SubmenuTrigger.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] font-medium font-[family-name:var(--font-body)] outline-none select-none transition-colors",
        "text-on-surface hover:bg-black/6 data-[highlighted]:bg-black/6 focus:bg-black/6 dark:hover:bg-white/10 dark:data-[highlighted]:bg-white/10 dark:focus:bg-white/10",
        "data-inset:pl-7 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto opacity-60" />
    </MenuPrimitive.SubmenuTrigger>
  )
}

function DropdownMenuSubContent({
  align = "start",
  alignOffset = -3,
  side = "right",
  sideOffset = 4,
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent>) {
  return (
    <DropdownMenuContent
      data-slot="dropdown-menu-sub-content"
      className={cn("w-auto min-w-[140px] max-h-[min(480px,calc(100vh-4.5rem))] overflow-y-auto custom-scrollbar rounded-xl bg-surface p-1.5 text-on-surface shadow-xl border border-outline-variant/50", className)}
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      {...props}
    />
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  inset,
  ...props
}: MenuPrimitive.CheckboxItem.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      data-inset={inset}
      className={cn(
        "relative flex cursor-pointer items-center gap-2 rounded-lg py-1.5 pr-8 pl-2.5 text-[13px] font-medium font-[family-name:var(--font-body)] outline-none select-none transition-colors",
        "text-on-surface hover:bg-black/6 data-[highlighted]:bg-black/6 focus:bg-black/6 dark:hover:bg-white/10 dark:data-[highlighted]:bg-white/10 dark:focus:bg-white/10",
        "data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      checked={checked}
      {...props}
    >
      <span
        className="pointer-events-none absolute right-2.5 flex items-center justify-center"
        data-slot="dropdown-menu-checkbox-item-indicator"
      >
        <MenuPrimitive.CheckboxItemIndicator>
          <CheckIcon size={14} className="text-primary" />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  )
}

function DropdownMenuRadioGroup({ ...props }: MenuPrimitive.RadioGroup.Props) {
  return (
    <MenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  inset,
  ...props
}: MenuPrimitive.RadioItem.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      data-inset={inset}
      className={cn(
        "relative flex cursor-pointer items-center gap-2 rounded-lg py-1.5 pr-8 pl-2.5 text-[13px] font-medium font-[family-name:var(--font-body)] outline-none select-none transition-colors",
        "text-on-surface hover:bg-black/6 data-[highlighted]:bg-black/6 focus:bg-black/6 dark:hover:bg-white/10 dark:data-[highlighted]:bg-white/10 dark:focus:bg-white/10",
        "data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span
        className="pointer-events-none absolute right-2.5 flex items-center justify-center"
        data-slot="dropdown-menu-radio-item-indicator"
      >
        <MenuPrimitive.RadioItemIndicator>
          <CheckIcon size={14} className="text-primary" />
        </MenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1.5 my-1.5 h-px bg-outline-variant/30", className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "ml-auto text-[11px] font-[family-name:var(--font-mono)] tracking-wider text-outline",
        className
      )}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
