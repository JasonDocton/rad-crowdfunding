// This is the input box where users can type a custom donation amount.

interface DonateCustomInputProps
	extends Omit<
		React.ComponentProps<'input'>,
		'className' | 'name' | 'placeholder' | 'type'
	> {}

function DonateCustomInput({ ...props }: DonateCustomInputProps) {
	return (
		<div className="focus-ring-within flex items-center border-2 border-secondary px-4 py-1 font-bold">
			<div>
				<div>$</div>
				<div>USD</div>
			</div>
			<input
				className="w-full text-right outline-none hover:text-white focus:text-white"
				name="customDonation"
				placeholder="Donate other amount"
				type="number"
				{...props}
			/>
		</div>
	)
}

export { DonateCustomInput }
