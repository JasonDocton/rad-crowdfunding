// Synchronizes confirmation count between parent component and modal
// Parent is source of truth, modal syncs on open and updates parent on change

import { type Dispatch, type SetStateAction, useEffect, useState } from 'react'

type Confirmations = { current: number; required: number } | null

interface UseConfirmationSyncParams {
	readonly isOpen: boolean
	readonly parentConfirmations: Confirmations
	readonly onUpdate: (confirmations: Confirmations) => void
}

interface UseConfirmationSyncReturn {
	readonly localConfirmations: Confirmations
	readonly setLocalConfirmations: Dispatch<SetStateAction<Confirmations>>
}

export function useConfirmationSync({
	isOpen,
	parentConfirmations,
	onUpdate,
}: UseConfirmationSyncParams): UseConfirmationSyncReturn {
	const [localConfirmations, setLocalConfirmations] =
		useState<Confirmations>(parentConfirmations)

	// Sync parent confirmations to local state when modal opens
	// This ensures the modal shows last known confirmations immediately on reopen
	useEffect(() => {
		if (isOpen && parentConfirmations !== null) {
			setLocalConfirmations(parentConfirmations)
		}
	}, [isOpen, parentConfirmations])

	// Sync local confirmations back to parent (separate from setState)
	// This avoids the "Cannot update component during render" error
	useEffect(() => {
		onUpdate(localConfirmations)
	}, [localConfirmations, onUpdate])

	return {
		localConfirmations,
		setLocalConfirmations,
	}
}
