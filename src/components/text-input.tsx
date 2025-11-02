// Straight forward text input field with labels and error messages.
// Just used for the donor display name and for the read only inputs.

import type { VariantProps } from 'cva'
import { cva } from 'cva'
import type { Ref } from 'react'
import { useId } from 'react'

const inputStyleVariants = cva('focus-ring w-full px-3 py-1.5', {
	variants: {
		variant: {
			default: 'mt-2 bg-secondary/5 not-focus:text-secondary/75',
			highlight:
				'border-2 border-primary bg-primary/50 font-medium text-sm text-white shadow-2xs',
		},
	},
	defaultVariants: {
		variant: 'default',
	},
})

interface TextInputProps extends React.ComponentProps<'input'> {
	readonly ref?: Ref<HTMLInputElement>
	readonly description?: string
	readonly label?: string
	readonly error?: boolean
	readonly errorMessage?: string
	readonly variant?: VariantProps<typeof inputStyleVariants>['variant']
}

// Text input component with label, description, and error handling
// Variants:
// - default: Standard form input style
// - highlight: Emphasized style for read-only/copyable values (used in modals)
function TextInput({
	description,
	label,
	error,
	errorMessage,
	variant = 'default',
	id: providedId,
	className,
	ref,
	...props
}: TextInputProps) {
	const generatedId = useId()
	const id = providedId ?? generatedId
	const descriptionId = `${id}-description`
	const errorId = `${id}-error`

	return (
		<label className="block w-full space-y-1">
			{label && <div className="font-medium">{label}</div>}
			{description && (
				<div className="text-secondary/50" id={descriptionId}>
					{description}
				</div>
			)}
			<input
				aria-describedby={description ? descriptionId : undefined}
				aria-errormessage={error ? errorId : undefined}
				aria-invalid={error}
				className={inputStyleVariants({ variant, className })}
				id={id}
				ref={ref}
				type="text"
				{...props}
			/>
			{error && errorMessage && (
				<div
					aria-live="polite"
					className="mt-2 rounded border-2 border-accent bg-accent/20 px-3 py-1.5 text-accent text-sm"
					id={errorId}
					role="alert"
				>
					{errorMessage}
				</div>
			)}
		</label>
	)
}

export { TextInput }
