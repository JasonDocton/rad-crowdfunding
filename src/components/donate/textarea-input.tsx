import { cx } from 'cva'
import { useId } from 'react'

interface DonateTextareaProps extends React.ComponentProps<'textarea'> {
	readonly description?: string
	readonly value: string
	readonly label?: string
	readonly error?: boolean
	readonly errorMessage?: string
}

function TextAreaInput({
	description,
	value,
	label,
	error,
	errorMessage,
	id: providedId,
	maxLength = 500,
	ref,
	...props
}: DonateTextareaProps) {
	const generatedId = useId()
	const id = providedId ?? generatedId
	const descriptionId = `${id}-description`
	const errorId = `${id}-error`
	const charCountId = `${id}-char-count`

	const currentLength = value.length
	const maxLengthValue = maxLength
	const messageCharLimitReached = currentLength >= maxLengthValue - 10
	const messageCharLimitCaution =
		currentLength >= maxLengthValue - 100 && currentLength < maxLengthValue - 10

	return (
		<label className="block w-full space-y-1">
			<div className="font-medium">Message</div>
			<div className="text-secondary/50" id={descriptionId}>
				Messages will be sent to Smiley's mother.
			</div>
			<textarea
				aria-describedby={`${descriptionId} ${charCountId}`}
				aria-errormessage={error ? errorId : undefined}
				aria-invalid={error}
				className="focus-ring mt-3 block w-full resize-none bg-white/5 px-3 py-1.5 not-focus:text-secondary/75 text-sm/6 focus:text-white"
				id={id}
				maxLength={maxLengthValue}
				placeholder={`Don't even think about it, Demon...`}
				ref={ref}
				rows={4}
				value={value}
				{...props}
			/>
			<div
				className={cx(
					'text-right font-medium text-xs',
					messageCharLimitReached
						? 'text-primary'
						: messageCharLimitCaution
							? 'text-accent'
							: 'text-quaternary'
				)}
				id={charCountId}
			>
				{currentLength}/{maxLengthValue}
			</div>
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

export { TextAreaInput }
