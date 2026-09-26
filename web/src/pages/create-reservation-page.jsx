import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BatteryCharging,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardCheck,
  RadioTower,
  Sparkles,
  UserRound,
  Zap
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { FeedbackAlert } from "@/components/feedback-alert";
import { ReservationRulesNotice } from "@/components/reservations/reservation-rules-notice";
import { ReservationSummary, formatUtc } from "@/components/reservations/reservation-summary";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";

const steps = [
  { label: "Prosumer", icon: UserRound },
  { label: "Station", icon: RadioTower },
  { label: "Slot & energy", icon: BatteryCharging },
  { label: "Review", icon: ClipboardCheck }
];

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
      // Load the active Prosumers and stations needed by the reservation form.
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
      // Reset dependent selections whenever the operator chooses another station.
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

        setSlots(slotData.filter((item) => {
          const startTime = new Date(item.startTime).getTime();
          return item.isActive &&
            item.status === "Available" &&
            startTime > now &&
            startTime <= sevenDaysFromNow;
        }));
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
  const energyIsValid = energyAmount > 0 && (!slot || energyAmount <= Number(slot.capacityKw));
  const formIsComplete = Boolean(prosumer && node && slot && energyIsValid);
  const activeStep = reviewing ? 4 : !prosumer ? 1 : !node ? 2 : !slot || !energyIsValid ? 3 : 4;

  async function createReservation() {
    // Submit the reviewed reservation and open the operation summary page.
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

  function changeProsumer(value) {
    // Return to edit mode when a form selection changes.
    setProsumerNic(value);
    setReviewing(false);
  }

  function changeNode(value) {
    // Save the selected station and reload its available slots.
    setNodeId(value);
    setReviewing(false);
  }

  function selectSlot(value) {
    // Store the operator's chosen booking slot.
    setSlotId(value);
    setReviewing(false);
  }

  return (
    <section className="space-y-6">
      <PageBanner />
      <ProgressSteps activeStep={activeStep} />

      {error && <FeedbackAlert>{error}</FeedbackAlert>}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <FormSection
            number="01"
            title="Choose an active Prosumer"
            description="The reservation will be created on behalf of this account."
            icon={UserRound}
            complete={Boolean(prosumer)}
          >
            {loading ? (
              <LoadingState text="Loading active Prosumers..." />
            ) : (
              <div className="space-y-2">
                <Label htmlFor="prosumer-selector">Prosumer NIC or name</Label>
                <Select value={prosumerNic} onValueChange={changeProsumer} disabled={reviewing}>
                  <SelectTrigger id="prosumer-selector" className="h-12 bg-white">
                    <SelectValue placeholder="Select an active Prosumer" />
                  </SelectTrigger>
                  <SelectContent>
                    {prosumers.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.fullName} - {item.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {prosumer && (
                  <SelectionNote
                    icon={CheckCircle2}
                    title={prosumer.fullName}
                    detail={`NIC ${prosumer.id} • ${prosumer.accountStatus} account`}
                  />
                )}
              </div>
            )}
          </FormSection>

          <FormSection
            number="02"
            title="Select a microgrid station"
            description="Only active stations returned by the microgrid service are shown."
            icon={RadioTower}
            complete={Boolean(node)}
            muted={!prosumer}
          >
            <div className="grid gap-3 md:grid-cols-2">
              {nodes.map((item) => {
                const selected = item.id === nodeId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!prosumer || reviewing}
                    onClick={() => changeNode(item.id)}
                    className={cn(
                      "group rounded-xl border p-4 text-left transition-all",
                      selected
                        ? "border-brand-500 bg-brand-50 shadow-[0_8px_24px_rgba(18,102,181,0.12)] ring-1 ring-brand-300"
                        : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md",
                      (!prosumer || reviewing) && "cursor-not-allowed opacity-60"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className={cn(
                        "grid size-10 place-items-center rounded-xl",
                        selected ? "bg-brand-600 text-white" : "bg-slate-100 text-brand-700"
                      )}>
                        <RadioTower size={20} />
                      </span>
                      {selected && <CheckCircle2 className="text-brand-600" size={20} />}
                    </div>
                    <p className="mt-3 font-bold text-slate-900">{item.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.capacityKw} kW station capacity</p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-emerald-700">Active station</p>
                  </button>
                );
              })}
            </div>
          </FormSection>

          <FormSection
            number="03"
            title="Reserve a slot and energy amount"
            description="Select a slot within seven days and enter an amount within its capacity."
            icon={CalendarClock}
            complete={Boolean(slot && energyIsValid)}
            muted={!node}
          >
            <div className="space-y-4">
              <div>
                <Label>Available booking slots (UTC)</Label>
                <div className="mt-2 grid gap-3 md:grid-cols-2">
                  {!node && <EmptyState text="Select a station to view its available slots." />}
                  {node && loadingSlots && <LoadingState text="Checking available slots..." />}
                  {node && !loadingSlots && slots.length === 0 && (
                    <EmptyState text="No available slots were found within the next seven days." tone="warning" />
                  )}
                  {slots.map((item) => (
                    <SlotButton
                      key={item.id}
                      slot={item}
                      selected={item.id === slotId}
                      disabled={reviewing}
                      onClick={() => selectSlot(item.id)}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="min-w-[220px] flex-1 space-y-2">
                    <Label htmlFor="energy-amount">Energy amount</Label>
                    <div className="relative">
                      <Zap className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" size={18} />
                      <Input
                        id="energy-amount"
                        className="h-12 bg-white pl-10 pr-16 text-base font-semibold"
                        type="number"
                        min="0.01"
                        step="0.01"
                        max={slot?.capacityKw}
                        value={energyAmountKw}
                        placeholder="0.00"
                        disabled={!slot || reviewing}
                        onChange={(event) => {
                          setEnergyAmountKw(event.target.value);
                          setReviewing(false);
                        }}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">kWh</span>
                    </div>
                  </div>
                  <CapacityIndicator slot={slot} energyAmount={energyAmount} />
                </div>
                {slot && energyAmount > Number(slot.capacityKw) && (
                  <p className="mt-3 text-sm font-medium text-red-600">
                    Enter an amount no greater than the slot capacity of {slot.capacityKw} kW.
                  </p>
                )}
              </div>

              <ReservationRulesNotice />
            </div>
          </FormSection>
        </div>

        <div className="space-y-4 xl:sticky xl:top-24">
          <ReservationSummary
            prosumer={prosumer}
            node={node}
            slot={slot}
            energyAmount={energyAmountKw}
          />

          {reviewing && (
            <FeedbackAlert variant="success">
              Everything is ready. Confirm to create this reservation with Pending status.
            </FeedbackAlert>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col-reverse gap-3 sm:flex-row xl:flex-col-reverse">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => reviewing ? setReviewing(false) : navigate("/reservations")}
              >
                <ArrowLeft size={16} />
                {reviewing ? "Back to edit" : "Cancel"}
              </Button>

              {reviewing ? (
                <Button className="w-full" onClick={createReservation} disabled={saving}>
                  <Check size={17} />
                  {saving ? "Creating reservation..." : "Create reservation"}
                </Button>
              ) : (
                <Button className="w-full" onClick={() => setReviewing(true)} disabled={!formIsComplete}>
                  Review reservation
                  <ArrowRight size={17} />
                </Button>
              )}
            </div>
            {!formIsComplete && !reviewing && (
              <p className="mt-3 text-center text-xs text-slate-500">Complete all three sections to continue.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function PageBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-brand-900 to-emerald-800 px-6 py-7 text-white shadow-lg">
      <div className="absolute -right-12 -top-20 size-56 rounded-full bg-cyan-300/15 blur-2xl" />
      <div className="absolute bottom-0 right-24 size-28 rounded-full bg-amber-300/15 blur-xl" />
      <div className="relative flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/20">
          <Sparkles className="text-amber-300" size={24} />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">Reservation management</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Create a clean-energy reservation</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-200 sm:text-base">
            Match an active Prosumer with an available microgrid slot in a clear, guided workflow.
          </p>
        </div>
      </div>
    </div>
  );
}

function ProgressSteps({ activeStep }) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-4">
      {steps.map(({ label, icon: Icon }, index) => {
        const stepNumber = index + 1;
        const complete = stepNumber < activeStep;
        const active = stepNumber === activeStep;

        return (
          <div
            key={label}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 transition-colors",
              active && "bg-brand-50",
              complete && "bg-emerald-50/70"
            )}
          >
            <span className={cn(
              "grid size-9 shrink-0 place-items-center rounded-full border text-sm font-bold",
              active && "border-brand-600 bg-brand-600 text-white",
              complete && "border-emerald-500 bg-emerald-500 text-white",
              !active && !complete && "border-slate-200 bg-slate-50 text-slate-400"
            )}>
              {complete ? <Check size={16} /> : <Icon size={16} />}
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Step {stepNumber}</p>
              <p className={cn("text-sm font-semibold", active ? "text-brand-700" : complete ? "text-emerald-700" : "text-slate-500")}>{label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FormSection({ number, title, description, icon: Icon, complete, muted = false, children }) {
  return (
    <Card className={cn("overflow-hidden border-slate-200 shadow-sm transition-opacity", muted && "opacity-60")}>
      <div className="h-1 bg-gradient-to-r from-brand-500 via-cyan-400 to-emerald-400" />
      <CardContent className="p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
              <Icon size={21} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">Step {number}</p>
              <h2 className="mt-0.5 text-lg font-bold text-slate-900">{title}</h2>
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            </div>
          </div>
          {complete && <CheckCircle2 className="shrink-0 text-emerald-500" size={22} />}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function SlotButton({ slot, selected, disabled, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-xl border p-4 text-left transition-all",
        selected
          ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-300"
          : "border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-9 place-items-center rounded-lg bg-slate-100 text-brand-700">
          <CalendarClock size={18} />
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-700">
          <span className="size-1.5 rounded-full bg-emerald-500" />Available
        </span>
      </div>
      <p className="mt-3 text-sm font-bold text-slate-900">{formatUtc(slot.startTime)}</p>
      <p className="mt-1 text-xs text-slate-500">Until {formatUtc(slot.endTime)}</p>
      <p className="mt-3 text-xs font-semibold text-brand-700">Capacity {slot.capacityKw} kW</p>
    </button>
  );
}

function CapacityIndicator({ slot, energyAmount }) {
  const percentage = slot && energyAmount > 0
    ? Math.min(100, Math.round((energyAmount / Number(slot.capacityKw)) * 100))
    : 0;

  return (
    <div className="min-w-[160px] flex-1">
      <div className="flex justify-between text-xs text-slate-500">
        <span>Slot usage</span>
        <span>{slot ? `${percentage}% of ${slot.capacityKw} kW` : "Select a slot"}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={cn("h-full rounded-full transition-all", percentage >= 100 ? "bg-red-500" : "bg-emerald-500")}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function SelectionNote({ icon: Icon, title, detail }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
      <Icon className="shrink-0 text-emerald-600" size={19} />
      <div>
        <p className="text-sm font-semibold text-emerald-900">{title}</p>
        <p className="text-xs text-emerald-700">{detail}</p>
      </div>
    </div>
  );
}

function LoadingState({ text }) {
  return <div className="animate-pulse rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">{text}</div>;
}

function EmptyState({ text, tone = "default" }) {
  return (
    <div className={cn(
      "col-span-full rounded-xl border border-dashed p-4 text-sm",
      tone === "warning" ? "border-amber-300 bg-amber-50 text-amber-800" : "border-slate-300 bg-slate-50 text-slate-500"
    )}>
      {text}
    </div>
  );
}
