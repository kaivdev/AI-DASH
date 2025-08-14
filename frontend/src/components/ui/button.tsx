import * as React from 'react'
import { cn } from '@/lib/utils'

export type ButtonVariant = 'default' | 'outline' | 'ghost' | 'link'
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant
	size?: ButtonSize
	asChild?: false
}

const base = 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50'

const variantClass: Record<ButtonVariant, string> = {
	default: 'bg-primary text-primary-foreground hover:opacity-90 border',
	outline: 'border bg-background hover:bg-muted/40',
	ghost: 'hover:bg-muted/40',
	link: 'text-primary underline-offset-4 hover:underline',
}

const sizeClass: Record<ButtonSize, string> = {
	default: 'h-9 px-4 py-2',
	sm: 'h-8 rounded-md px-3',
	lg: 'h-10 rounded-md px-8',
	icon: 'h-9 w-9',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant = 'default', size = 'default', ...props }, ref) => {
		return (
			<button
				ref={ref}
				className={cn(base, variantClass[variant], sizeClass[size], className)}
				{...props}
			/>
		)
	}
)

Button.displayName = 'Button' 