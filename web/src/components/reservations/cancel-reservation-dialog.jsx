import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { formatUtcRange } from "@/components/reservations/reservation-summary";

export function CancelReservationDialog({ open, onOpenChange, reservation, busy, onConfirm }) {
  if (!reservation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlert className="text-red-600" size={21} />
            Cancel reservation?
          </DialogTitle>
          <DialogDescription>
            This reservation will be marked as Cancelled. It will not be permanently deleted.
          </DialogDescription>
        </DialogHeader>

        <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm">
          <DialogRow
            label="Prosumer"
            value={`${reservation.prosumerName || "Prosumer"} (${reservation.prosumerNic})`}
          />
          <DialogRow label="Station" value={reservation.nodeName || reservation.nodeId} />
          <DialogRow
            label="Scheduled time"
            value={formatUtcRange(reservation.startTime, reservation.endTime)}
          />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={busy}>
              Keep reservation
            </Button>
          </DialogClose>
          <Button className="bg-red-600 hover:bg-red-700" onClick={onConfirm} disabled={busy}>
            {busy ? "Cancelling..." : "Cancel reservation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogRow({ label, value }) {
  // Keep confirmation details aligned and readable on smaller screens.
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="break-words font-medium text-slate-800 sm:text-right">{value}</span>
    </div>
  );
}
