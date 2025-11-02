// This shows a scrolling list of recent donations with names and amounts.
// Thanks to Convex, this updates in real-time as donations come in.

import { api } from 'convex/_generated/api'
import { useQuery } from 'convex/react'
import type { DonationListItem } from 'convex/types'
import { DonationIcon } from './donation-icon.tsx'

interface DonationTableProps {
	readonly initialDonations?: DonationListItem[]
}

function DonationTable({ initialDonations = [] }: DonationTableProps) {
	const result = useQuery(api.donation.getDonorList, {
		paginationOpts: { numItems: 50, cursor: null },
	})
	const donations = result?.page ?? initialDonations

	if (donations.length === 0) {
		return (
			<div className="border-2 border-secondary p-6 text-center">
				<p className="text-lg">
					Be the first to donate and help us reach our goal!
				</p>
			</div>
		)
	}

	return (
		<div className="no-scrollbar max-h-[40svh] overflow-y-auto border-2 border-secondary p-2">
			<table className="w-full">
				<caption className="sr-only">Recent donations to this campaign</caption>
				<thead>
					<tr className="sr-only">
						<th scope="col">Donation Icon</th>
						<th scope="col">Amount and Donor Name</th>
					</tr>
				</thead>
				<tbody>
					{donations.map((donation) => (
						<tr className="flex items-center gap-4 py-4" key={donation.id}>
							<th
								className="rounded-full bg-primary"
								data-slot="table-cell"
								scope="row"
							>
								<DonationIcon amount={donation.amount} size={50} />
							</th>
							<td className="grid grid-cols-1 place-items-start">
								<div
									className="font-bold text-accent text-xl"
									data-slot="table-cell"
								>
									$
									{donation.amount.toLocaleString('en-US', {
										minimumFractionDigits: 2,
										maximumFractionDigits: 2,
									})}
								</div>
								<div className="text-xl" data-slot="table-cell">
									{donation.display_name}
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}

export { DonationTable }
