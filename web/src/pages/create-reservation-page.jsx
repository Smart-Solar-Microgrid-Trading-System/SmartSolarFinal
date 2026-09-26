import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ClipboardCheck,
  Network,
  UserRound,
  Zap
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { FeedbackAlert } from "@/components/feedback-alert";
import { ReservationRulesNotice } from "@/components/reservations/reservation-rules-notice";
import { ReservationSummary, formatUtc } from "@/components/reservations/reservation-summary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export function CreateReservationPage() {
  const { session } = useAuth();
  const navigate = useNavigate();

  const [prosumers, setProsumers] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [slots, setSlots] = useState([]);
  const [prosumerNic, setProsumerNic] = useState("");
  const [nodeId, setNodeId] = useState("");
  const [slotId, setSlotId] = useState("");
  const [energyAmountKw, setEnergyAmountKw] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadFormOptions() {
      // Load the active Prosumers and microgrid nodes used by the form.
      setLoading(true);
      setError("");

      try {
        const [prosumerData, nodeData] = await Promise.all([
          api.getProsumers(session.token, "Active"),
          api.getNodes(session.token)
        ]);

        setProsumers(prosumerData);
        setNodes(nodeData);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    }

    loadFormOptions();
  }, [session.token]);

  useEffect(() => {
    async function loadAvailableSlots() {
      // Clear the old slot before loading slots for the selected node.
      setSlotId("");
      setSlots([]);

      if (!nodeId) {
        return;
      }

      setLoadingSlots(true);
      setError("");

      try {
        const slotData = await api.getBookingSlotsByNode(session.token, nodeId);
        const now = Date.now();
        const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000;

        const availableSlots = slotData.filter((item) => {
          const startTime = new Date(item.startTime).getTime();
          return item.isActive &&
            item.status === "Available" &&
            startTime > now &&
            startTime <= sevenDaysFromNow;
        });

        setSlots(availableSlots);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoadingSlots(false);
      }
    }

    loadAvailableSlots();
  }, [nodeId, session.token]);

  const prosumer = useMemo(
    () => prosumers.find((item) => item.id === prosumerNic),
    [prosumers, prosumerNic]
  );
  const node = useMemo(
    () => nodes.find((item) => item.id === nodeId),
    [nodes, nodeId]
  );
  const slot = useMemo(
    () => slots.find((item) => item.id === slotId),
    [slots, slotId]
  );

  const energyAmount = Number(energyAmountKw);
  const energyIsValid = energyAmount > 0 &&
    (!slot || energyAmount <= Number(slot.capacityKw));
  const formIsComplete = Boolean(prosumer && node && slot && energyIsValid);

  async function createReservation() {
    // Create the reservation after the operator reviews the entered details.
    setSaving(true);
    setError("");

    try {
      const result = await api.createReservation(session.token, {
        prosumerNic,
        nodeId,
        slotId,
        energyAmountKw: energyAmount
      });

      navigate(`/reservations/${result.id}/summary`, {
        state: { operation: "created" }
      });
    } catch (requestError) {
      setError(requestError.message);
      setReviewing(false);
    } finally {
      setSaving(false);
    }
  }

  function updateProsumer(value) {
    // Store the selected Prosumer and return the form to edit mode.
    setProsumerNic(value);
    setReviewing(false);
  }

  function updateNode(value) {
    // Store the selected node so its available slots can be loaded.
    setNodeId(value);
    setReviewing(false);
  }

  function updateSlot(value) {
    // Store the selected booking slot and return the form to edit mode.
    setSlotId(value);
    setReviewing(false);
  }

  function updateEnergyAmount(event) {
    // Store the energy amount entered by the operator.
    setEnergyAmountKw(event.target.value);
    setReviewing(false);
  }

  return (
    <section className="space-y-5">
      <header>
        <p className="text-sm text-slate-500">
          <span className="font-medium text-brand-600">Reservations</span> / Create
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Create Reservation</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create an energy booking for an existing active Prosumer.
        </p>
      </header>

      {error && <FeedbackAlert>{error}</FeedbackAlert>}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-lg bg-brand-600 text-white">
                <CalendarDays size={21} />
              </span>
              <div>
                <CardTitle>{reviewing ? "Review Reservation" : "Reservation Details"}</CardTitle>
                <p className="mt-1 text-sm text-slate-500">
                  {reviewing
                    ? "Check the details before creating the reservation."
                    : "Select the Prosumer, node, slot, and energy amount."}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 pt-5">
            {loading ? (
              <p className="text-sm text-slate-500">Loading active Prosumers and microgrid nodes...</p>
            ) : (
              <>
                <Field label="Prosumer (NIC or name)" required>
                  <Select value={prosumerNic} onValueChange={updateProsumer} disabled={reviewing}>
                    <SelectTrigger className="h-12 bg-white">
                      <UserRound className="mr-2 shrink-0 text-slate-500" size={18} />
                      <SelectValue placeholder="Select an active Prosumer" />
                    </SelectTrigger>
                    <SelectContent>
                      {prosumers.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.fullName} - {item.id} ({item.accountStatus})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Microgrid node" required>
                  <Select value={nodeId} onValueChange={updateNode} disabled={reviewing}>
                    <SelectTrigger className="h-12 bg-white">
                      <Network className="mr-2 shrink-0 text-slate-500" size={18} />
                      <SelectValue placeholder="Select a station" />
                    </SelectTrigger>
                    <SelectContent>
                      {nodes.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} - {item.capacityKw} kW
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Available booking slot" required>
                  <Select
                    value={slotId}
                    onValueChange={updateSlot}
                    disabled={!nodeId || loadingSlots || reviewing}
                  >
                    <SelectTrigger className="h-12 bg-white">
                      <CalendarDays className="mr-2 shrink-0 text-slate-500" size={18} />
                      <SelectValue
                        placeholder={loadingSlots
                          ? "Loading available slots..."
                          : nodeId
                            ? "Select an available slot"
                            : "Select a station first"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {slots.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {formatUtc(item.startTime)} - {formatUtc(item.endTime)} ({item.capacityKw} kW)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {nodeId && !loadingSlots && slots.length === 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                      No available slots were found within the next seven days.
                    </div>
                  )}
                </Field>

                <Field label="Energy amount (kWh)" required>
                  <div className="flex h-12 overflow-hidden rounded-md border border-input bg-white focus-within:ring-2 focus-within:ring-ring">
                    <span className="grid w-12 shrink-0 place-items-center border-r border-slate-200 text-slate-600">
                      <Zap size={18} />
                    </span>
                    <Input
                      className="h-full rounded-none border-0 shadow-none focus-visible:ring-0"
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={slot?.capacityKw}
                      value={energyAmountKw}
                      onChange={updateEnergyAmount}
                      disabled={!slot || reviewing}
                      placeholder="Enter an energy amount"
                    />
                    <span className="grid w-16 shrink-0 place-items-center border-l border-slate-200 bg-slate-50 text-sm font-medium text-slate-600">
                      kWh
                    </span>
                  </div>
                  {slot && energyAmount > Number(slot.capacityKw) && (
                    <p className="text-xs text-red-600">
                      The amount cannot exceed the slot capacity of {slot.capacityKw} kW.
                    </p>
                  )}
                </Field>

                <ReservationRulesNotice />

                <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                  <Button
                    variant="outline"
                    onClick={() => reviewing ? setReviewing(false) : navigate("/reservations")}
                  >
                    <ArrowLeft size={16} />
                    {reviewing ? "Back to edit" : "Cancel"}
                  </Button>

                  {reviewing ? (
                    <Button onClick={createReservation} disabled={saving}>
                      <Check size={16} />
                      {saving ? "Creating..." : "Create Reservation"}
                    </Button>
                  ) : (
                    <Button onClick={() => setReviewing(true)} disabled={!formIsComplete}>
                      <ClipboardCheck size={16} />
                      Review Reservation
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <ReservationSummary
            prosumer={prosumer}
            node={node}
            slot={slot}
            energyAmount={energyAmountKw}
          />

          {reviewing && (
            <FeedbackAlert variant="success">
              Review the information, then create the reservation. Its initial status will be Pending.
            </FeedbackAlert>
          )}
        </div>
      </div>

    </section>
  );
}

function Field({ label, required = false, children }) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </Label>
      {children}
    </div>
  );
}
