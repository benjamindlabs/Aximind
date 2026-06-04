import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', loading = false, children, ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer",
          // Variants
          variant === 'default' && "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-505 hover:shadow-indigo-555 hover:bg-indigo-500 hover:shadow-indigo-500/30",
          variant === 'destructive' && "bg-red-650 hover:bg-red-500 text-white shadow-md shadow-red-600/10",
          variant === 'outline' && "border border-zinc-800 bg-transparent hover:bg-zinc-900 text-zinc-200 hover:text-white",
          variant === 'secondary' && "bg-zinc-800 text-zinc-100 hover:bg-zinc-700",
          variant === 'ghost' && "hover:bg-zinc-900 text-zinc-450 hover:text-zinc-100",
          variant === 'link' && "text-indigo-400 underline-offset-4 hover:underline",
          // Sizes
          size === 'default' && "h-10 px-4 py-2",
          size === 'sm' && "h-9 rounded-md px-3",
          size === 'lg' && "h-11 rounded-md px-8 text-base",
          size === 'icon' && "h-10 w-10",
          className
        )}
        disabled={loading || props.disabled}
        ref={ref}
        {...props}
      >
        {loading && (
          <svg className="mr-2 h-4 w-4 animate-spin text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button }
