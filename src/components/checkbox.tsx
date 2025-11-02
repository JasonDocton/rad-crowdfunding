// This is the checkbox we use on the donate page.
// Made reusable in the case we added donation message or other options.

interface CheckboxInputProps
	extends Omit<React.ComponentProps<'input'>, 'type'> {
	children?: React.ReactNode
}

function CheckboxIndicator() {
	return (
		<svg
			aria-hidden="true"
			className="size-4"
			fill="none"
			stroke="currentColor"
			strokeWidth={4}
			viewBox="0 0 24 24"
		>
			<path
				d="m4.5 12.75 6 6 9-13.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	)
}

function CheckboxInput({ children, checked, ...props }: CheckboxInputProps) {
	return (
		<label className="inline-flex cursor-pointer items-center space-x-2 font-bold">
			<div className="relative flex items-center justify-center">
				<input
					checked={checked}
					className="focus-ring peer size-5 appearance-none border-2 border-secondary checked:bg-accent"
					type="checkbox"
					{...props}
				/>
				<div className="pointer-events-none absolute text-white opacity-0 transition-opacity peer-checked:opacity-100">
					<CheckboxIndicator />
				</div>
			</div>
			<span>{children}</span>
		</label>
	)
}

export { CheckboxInput }
