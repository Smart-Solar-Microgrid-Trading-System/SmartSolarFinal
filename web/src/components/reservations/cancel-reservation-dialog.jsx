import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatUtc } from "@/components/reservations/reservation-summary";

export function CancelReservationDialog({ open, onOpenChange, reservation, busy, onConfirm }) {
  if (!reservation) return null;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle className="flex items-center gap-2"><TriangleAlert className="text-red-600" size={21} />Cancel reservation?</DialogTitle><DialogDescription>This reservation will be marked as Cancelled. It will not be permanently deleted.</DialogDescription></DialogHeader><div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm"><p><b>Prosumer:</b> {reservation.prosumerName || reservation.prosumerNic} ({reservation.prosumerNic})</p><p><b>Station:</b> {reservation.nodeName || reservation.nodeId}</p><p><b>Scheduled:</b> {formatUtc(reservation.startTime)}</p></div><DialogFooter><DialogClose asChild><Button variant="outline" disabled={busy}>Keep reservation</Button></DialogClose><Button className="bg-red-600 hover:bg-red-700" onClick={onConfirm} disabled={busy}>{busy ? "Cancelling..." : "Cancel reservation"}</Button></DialogFooter></DialogContent></Dialog>;
}
