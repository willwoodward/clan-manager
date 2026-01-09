import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, checked, onChange, id, ...props }, ref) => {
    const generatedId = React.useId()
    const checkboxId = id || generatedId

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e)
      onCheckedChange?.(e.target.checked)
    }

    return (
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          ref={ref}
          id={checkboxId}
          checked={checked}
          onChange={handleChange}
          {...props}
        />
        <label
          htmlFor={checkboxId}
          className={cn(
            "h-5 w-5 shrink-0 rounded border border-input bg-background",
            "ring-offset-background",
            "peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
            "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
            "peer-checked:bg-primary peer-checked:border-primary peer-checked:text-primary-foreground",
            "cursor-pointer transition-colors",
            "flex items-center justify-center",
            className
          )}
        >
          <Check
            className={cn(
              "h-4 w-4 text-current transition-opacity",
              checked ? "opacity-100" : "opacity-0"
            )}
          />
        </label>
      </div>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
