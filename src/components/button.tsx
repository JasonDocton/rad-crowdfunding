// This is the main button component used throughout the site.
// It can be a regular button or a special copy button that copies text to clipboard.

import { Slot } from '@radix-ui/react-slot'
import type { VariantProps } from 'cva'
import { cva } from 'cva'
import type { ButtonHTMLAttributes, Ref } from 'react'
import { useState } from 'react'
import { logger } from '@/utils/logger.ts'
import { CopyIcon } from './copy-icon.tsx'

const buttonStyleVariants = cva(
	'whitespace-nowrap px-4 py-2 text-center font-bold text-xl uppercase transition-[background-color,border-color,color,opacity] duration-300 ease-in-out disabled:pointer-events-none disabled:bg-quaternary sm:text-2xl',
	{
		variants: {
			variant: {
				primary:
					'focus-ring-secondary w-full border-4 border-transparent bg-primary text-white hover:bg-primary/80',
				secondary:
					'focus-ring w-full border-4 border-secondary/40 hover:border-secondary',
				tertiary:
					'focus-ring border-2 border-secondary hover:border-secondary/40',
				copy: 'focus-ring relative p-0', // Copy button variant
			},
			size: {
				default: '',
				sm: 'size-6', // Small copy button
				md: 'size-8', // Medium copy button
			},
		},
		defaultVariants: {
			variant: 'primary',
			size: 'default',
		},
	}
)

interface BaseButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	readonly ref?: Ref<HTMLButtonElement>
	readonly variant?: Exclude<
		VariantProps<typeof buttonStyleVariants>['variant'],
		'copy'
	>
	readonly size?: never
	readonly asChild?: boolean
	readonly textToCopy?: never
	readonly onCopySuccess?: never
}

interface CopyButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	readonly ref?: Ref<HTMLButtonElement>
	readonly variant: 'copy'
	readonly size?: VariantProps<typeof buttonStyleVariants>['size']
	readonly asChild?: never
	readonly textToCopy: string
	readonly onCopySuccess?: () => void
}

type ButtonProps = BaseButtonProps | CopyButtonProps

function Button({
	variant = 'primary',
	asChild = false,
	className,
	ref,
	...props
}: ButtonProps) {
	const [isCopied, setIsCopied] = useState(false)

	// Handle copy button variant
	if (variant === 'copy') {
		const {
			textToCopy,
			onCopySuccess,
			size = 'md',
			...buttonProps
		} = props as CopyButtonProps

		const handleCopy = async (): Promise<void> => {
			try {
				await navigator.clipboard.writeText(textToCopy)
				setIsCopied(true)
				onCopySuccess?.()

				// Reset after 2 seconds
				setTimeout(() => setIsCopied(false), 2000)
			} catch (error) {
				const errorMsg =
					error instanceof Error ? error.message : 'Unknown error'
				logger.error('Failed to copy to clipboard:', errorMsg)
			}
		}

		return (
			<button
				className={buttonStyleVariants({ variant, size, className })}
				onClick={handleCopy}
				ref={ref}
				type="button"
				{...buttonProps}
			>
				<CopyIcon isCopied={isCopied} />
			</button>
		)
	}

	// Handle regular button variants
	const Component = asChild ? Slot : 'button'

	return (
		<Component
			className={buttonStyleVariants({ variant, className })}
			ref={ref}
			{...props}
		/>
	)
}

export { Button }
