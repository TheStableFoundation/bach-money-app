import { cva, type VariantProps } from "class-variance-authority"

import { twMerge } from "tailwind-merge"

const button = cva(
  ["justify-center", "inline-flex", "items-center", "rounded-lg", "text-center", "border", "font-medium", "transition-colors"],
  {
    variants: {
      intent: {
        primary: ["bg-ink", "text-bg", "border-ink", "hover:enabled:bg-accent-ink", "hover:enabled:border-accent-ink"],
        secondary: ["bg-transparent", "text-ink", "border-border", "hover:enabled:bg-surface-2"],
      },
      size: {
        sm: ["min-w-20", "h-10", "text-sm", "px-4"],
        lg: ["min-w-32", "h-11", "text-sm", "px-6"],
      },
      underline: { true: ["underline"], false: [] },
    },
    defaultVariants: {
      intent: "primary",
      size: "lg",
    },
  }
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLAnchorElement>, VariantProps<typeof button> {
  underline?: boolean
  href: string
}

export function Button({ className, intent, size, underline, ...props }: ButtonProps) {
  return (
    <a className={twMerge(button({ intent, size, className, underline }))} {...props}>
      {props.children}
    </a>
  )
}
