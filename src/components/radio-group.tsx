// This lets users pick one choice from a list, like selecting a donation amount or payment method.
// The selected choice is highlighted so users can see what they picked.

import { cva, type VariantProps } from 'cva'
import type { ReactNode } from 'react'

const radioLabelVariants = cva(
	'focus-ring-parent cursor-pointer transition-[background-color,border-color,color,opacity] duration-300 disabled:cursor-not-allowed disabled:opacity-50',
	{
		variants: {
			variant: {
				// Prominent style for donation amounts - captures visual attention
				donation:
					'border-2 border-secondary p-3 text-center font-bold hover:bg-accent/50 has-[:checked]:bg-primary has-[:checked]:text-white',
				// Subtle style for payment method selection - secondary focus
				method:
					'w-full rounded border-2 border-secondary/40 p-3 hover:border-secondary/60 has-[:checked]:border-primary has-[:checked]:bg-primary/10',
			},
		},
		defaultVariants: {
			variant: 'donation',
		},
	}
)

interface RadioOption<T extends string | number> {
	value: T
	label: ReactNode
	description?: string
}

interface RadioGroupProps<T extends string | number> {
	name: string
	legend: string
	options: RadioOption<T>[]
	value: T | undefined
	onChange: (value: T) => void
	variant?: VariantProps<typeof radioLabelVariants>['variant']
	className?: string
	disabled?: boolean
}

function RadioGroup<T extends string | number>({
	name,
	legend,
	options,
	value,
	onChange,
	variant = 'donation',
	className,
	disabled = false,
}: RadioGroupProps<T>) {
	return (
		<fieldset className={className} disabled={disabled}>
			<legend className="sr-only">{legend}</legend>
			{options.map((option) => {
				const isChecked = value === option.value
				const inputId = `${name}-${option.value}`

				return (
					<label
						className={radioLabelVariants({ variant })}
						htmlFor={inputId}
						key={option.value}
					>
						<input
							checked={isChecked}
							className="sr-only"
							disabled={disabled}
							id={inputId}
							name={name}
							onChange={() => onChange(option.value)}
							type="radio"
							value={option.value}
						/>
						<div>
							<span className="block font-medium">{option.label}</span>
							{option.description && (
								<span className="mt-1 block text-secondary/75 text-xs">
									{option.description}
								</span>
							)}
						</div>
					</label>
				)
			})}
		</fieldset>
	)
}

export { RadioGroup, type RadioOption }
