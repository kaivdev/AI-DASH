"use client"

import * as React from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ChevronDownIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DatePicker } from 'antd'

export function Calendar22() {
	const [open, setOpen] = React.useState(false)
	const [date, setDate] = React.useState<Date | undefined>(undefined)

	return (
		<div className="flex flex-col gap-3">
			<Label htmlFor="date" className="px-1">
				Date of birth
			</Label>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						id="date"
						className="w-48 justify-between font-normal"
					>
						{date ? format(date, 'dd.MM.yyyy') : 'Select date'}
						<ChevronDownIcon />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto overflow-hidden p-0" align="start">
					<DatePicker onChange={(d)=> { setDate(d?.toDate()) ; setOpen(false) }} open inputReadOnly />
				</PopoverContent>
			</Popover>
		</div>
	)
}

export function DatePickerDemo() {
	const [date, setDate] = React.useState<Date | undefined>()

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					data-empty={!date}
					className="data-[empty=true]:text-muted-foreground w-[280px] justify-start text-left font-normal"
				>
					{date ? format(date, 'PPP', { locale: ru }) : <span>Pick a date</span>}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0">
				<DatePicker onChange={(d)=> setDate(d?.toDate())} open inputReadOnly />
			</PopoverContent>
		</Popover>
	)
} 