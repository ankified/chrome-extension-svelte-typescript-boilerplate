<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Calendar } from '$lib/components/ui/calendar';
	import * as Card from '$lib/components/ui/card';
	import { getLocalTimeZone, today, type CalendarDate } from '@internationalized/date';

	type $$Props = {
		open?: boolean;
		initialDate: CalendarDate | undefined;
		initialTime: string | null;
		onClose: () => void;
		onSave: (date: CalendarDate | undefined, time: string | null) => void;
	};

	let {
		open = $bindable(),
		initialDate,
		initialTime,
		onClose,
		onSave
	} = $props();

	let date = $state<CalendarDate | undefined>(initialDate);
	let time = $state<string | null>(initialTime);

	// When the dialog opens, sync state with initial props
	$effect(() => {
		if (open) {
			date = initialDate;
			time = initialTime;
		}
	});

	const timeSlots = Array.from({ length: 96 }, (_, i) => {
		const totalMinutes = i * 15;
		const hour = Math.floor(totalMinutes / 60);
		const minute = totalMinutes % 60;
		return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
	});

	let availableTimeSlots = $state(timeSlots);

	$effect(() => {
		if (!date) {
			availableTimeSlots = timeSlots;
			return;
		}

		const now = today(getLocalTimeZone());
		const comparison = date.compare(now);
		let newSlots: string[] = [];

		if (comparison < 0) {
			// Past
			newSlots = [];
		} else if (comparison > 0) {
			// Future
			newSlots = timeSlots;
		} else {
			// Today
			const d = new Date();
			const currentHour = d.getHours();
			const currentMinute = d.getMinutes();

			newSlots = timeSlots.filter((timeSlot: string) => {
				const [hour, minute] = timeSlot.split(':').map(Number);
				return hour > currentHour || (hour === currentHour && minute >= currentMinute);
			});
		}

		availableTimeSlots = newSlots;
	});

	function handleSave() {
		onSave(date, time);
		onClose();
	}
</script>

<Dialog.Root bind:open onOpenChange={(v) => !v && onClose()}>
	<Dialog.Content class="sm:max-w-fit p-0">
		<Card.Root class="gap-0 p-0">
			<Card.Content class="relative p-0 md:pr-32 flex flex-col md:flex-row">
				<div class="p-4 flex-1">
					<Calendar
						type="single"
						bind:value={date}
						class="bg-transparent p-0 [--cell-size:--spacing(8)] md:[--cell-size:--spacing(10)] [&_[data-outside-month]]:hidden"
						weekdayFormat="short"
					/>
				</div>
				<div
					class="no-scrollbar inset-y-0 right-0 flex max-h-64 w-full scroll-pb-4 flex-col gap-2 overflow-y-auto border-t p-4 md:absolute md:max-h-none md:w-32 md:border-l md:border-t-0 md:gap-2 md:p-4"
				>
					{#if date}
						<div class="grid gap-2">
							{#each availableTimeSlots as slot (slot)}
								<Button
									variant={time === slot ? 'default' : 'outline'}
									class="w-full shadow-none text-xs py-1"
									onclick={() => (time = slot)}
								>
									{slot}
								</Button>
							{/each}
						</div>
						{#if availableTimeSlots.length === 0}
							<div class="flex h-full items-center justify-center">
								<p class="text-xs text-muted-foreground text-center">Nenhum horário disponível.</p>
							</div>
						{/if}
					{:else}
						<div class="flex h-full items-center justify-center">
							<p class="text-xs text-muted-foreground text-center">
								Selecione uma data para ver os horários.
							</p>
						</div>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>
		<Dialog.Footer class="p-4 border-t">
			<Button variant="outline" onclick={onClose}>Cancel</Button>
			<Button onclick={handleSave}>Save</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root> 