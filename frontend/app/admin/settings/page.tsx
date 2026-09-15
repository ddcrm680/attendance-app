"use client";

import { useCallback, useEffect, useState } from "react";
import { adminAttendanceSetting, adminOffices, updateAdminAttendanceSetting, type AttendanceSetting, type Office } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import AppLoading from "@/components/AppLoading";
import { useTheme } from "@/components/ThemeProvider";

const days = [[1, "Monday"], [2, "Tuesday"], [3, "Wednesday"], [4, "Thursday"], [5, "Friday"], [6, "Saturday"], [7, "Sunday"]] as const;
const categories = [["appearance", "Appearance", "Theme and brand preferences"], ["attendance", "Attendance & Work Policy", "Office attendance, location, and work-from-home policy"]] as const;
type SettingsCategory = (typeof categories)[number][0];
type FormValues = Omit<AttendanceSetting, "id" | "office_id">;
type SetValue = <K extends keyof FormValues>(key: K, value: FormValues[K]) => void;

function toFormValues(setting: AttendanceSetting): FormValues {
  return { ...setting, office_start_time: setting.office_start_time.slice(0, 5), office_end_time: setting.office_end_time.slice(0, 5) };
}

export default function AdminSettingsPage() {
  const { preference, setPreference, accent, setAccent } = useTheme();
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("appearance");
  const [offices, setOffices] = useState<Office[]>([]);
  const [officeId, setOfficeId] = useState("");
  const [form, setForm] = useState<FormValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeAccent, setActiveAccent] = useState("#3159d8");
  const [accentError, setAccentError] = useState<string | null>(null);
  const activeCategoryDetails = categories.find(([id]) => id === activeCategory)!;

  useEffect(() => {
    const readAccent = () => setActiveAccent(getComputedStyle(document.documentElement).getPropertyValue("--accent").trim());
    readAccent();
    const frame = requestAnimationFrame(readAccent);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener?.("change", readAccent);
    return () => { cancelAnimationFrame(frame); media.removeEventListener?.("change", readAccent); };
  }, [accent, preference]);

  const loadOffices = useCallback(() => {
    setLoading(true); setError(null);
    adminOffices().then((nextOffices) => { setOffices(nextOffices); setOfficeId((current) => current || String(nextOffices[0]?.id ?? "")); })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load settings."))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { loadOffices(); }, [loadOffices]);
  useEffect(() => {
    if (!officeId) return;
    setLoading(true); setError(null); setNotice(null);
    adminAttendanceSetting(Number(officeId)).then((setting) => { if (!setting) throw new Error("Attendance settings are unavailable for this office."); setForm(toFormValues(setting)); })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load attendance settings."))
      .finally(() => setLoading(false));
  }, [officeId]);

  const setValue: SetValue = (key, value) => setForm((current) => current ? { ...current, [key]: value } : current);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form || !officeId) return;
    setSaving(true); setError(null); setNotice(null);
    try { const saved = await updateAdminAttendanceSetting(Number(officeId), form); setForm(toFormValues(saved)); setNotice("Attendance settings saved."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save attendance settings."); }
    finally { setSaving(false); }
  }

  return <section className="settings-center">
    <PageHeader title="Settings" description="Manage workspace appearance and attendance policies." />
    <div className="settings-center-layout">
      <nav className="settings-category-nav" aria-label="Settings categories">
        <p className="settings-category-nav-label">Settings center</p>
        <div className="settings-category-list">
          {categories.map(([id, label, description]) => <button key={id} type="button" className={`settings-category-button${activeCategory === id ? " settings-category-button-active" : ""}`} aria-current={activeCategory === id ? "page" : undefined} onClick={() => setActiveCategory(id)}><span>{label}</span><small>{description}</small></button>)}
        </div>
      </nav>
      <section className="settings-category-content" aria-labelledby="settings-category-title">
        <header className="settings-category-header"><p className="app-eyebrow">Settings / {activeCategoryDetails[1]}</p><h2 id="settings-category-title">{activeCategoryDetails[1]}</h2><p>{activeCategoryDetails[2]}</p></header>
        {activeCategory === "appearance" && <section className="settings-appearance-grid" aria-label="Appearance preferences">
          <label className="text-sm">Theme<select className="app-form-select mt-1" value={preference} onChange={(event) => setPreference(event.target.value as "light" | "dark" | "system")}><option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option></select><span className="settings-field-help">Follows this browser&apos;s display preference when set to System.</span></label>
          <div className="text-sm"><span className="block">Brand accent</span><div className="mt-1 flex min-h-11 items-center gap-3"><input aria-label="Brand accent color" type="color" value={activeAccent} onChange={(event) => { if (setAccent(event.target.value)) { setActiveAccent(event.target.value); setAccentError(null); } else setAccentError("Choose a color with sufficient text contrast."); }} className="h-11 w-14 cursor-pointer rounded border border-[var(--control-line)] bg-[var(--surface)] p-1" /><output className="font-mono text-sm text-gray-600" aria-live="polite">{activeAccent.toUpperCase()}</output><button type="button" className="app-secondary-action min-h-10 px-3 text-sm" disabled={!accent} onClick={() => setAccent(null)}>Reset to default</button></div>{accentError && <p role="alert" className="mt-2 text-xs text-red-700">{accentError}</p>}</div>
          <div className="settings-accent-preview" aria-label="Accent preview"><span>Accent preview</span><div><button type="button" className="app-primary-action" tabIndex={-1}>Primary action</button><span className="settings-preview-link">Selected item</span><i aria-hidden="true" /></div></div>
        </section>}
        {error && <p role="alert" className="app-feedback app-feedback-error">{error}</p>}
        {notice && <p role="status" className="app-feedback app-feedback-success">{notice}</p>}
        {loading && activeCategory !== "appearance" && <AppLoading variant="inline" message="Loading settings…" />}
        {form && !loading && activeCategory !== "appearance" && <form onSubmit={submit} className="settings-policy-form">
          {activeCategory === "attendance" && <><AttendanceSettings form={form} offices={offices} officeId={officeId} setOfficeId={setOfficeId} setValue={setValue} /><LocationSettings form={form} setValue={setValue} /><WfhSettings form={form} setValue={setValue} /></>}
          <button type="submit" disabled={saving} className="app-primary-action min-h-10 self-start px-4 text-sm disabled:opacity-50">{saving ? "Saving…" : "Save settings"}</button>
        </form>}
      </section>
    </div>
  </section>;
}

function AttendanceSettings({ form, offices, officeId, setOfficeId, setValue }: { form: FormValues; offices: Office[]; officeId: string; setOfficeId: (officeId: string) => void; setValue: SetValue }) {
  return <><label className="block max-w-md text-sm">Office<select className="app-form-control mt-1" value={officeId} onChange={(event) => setOfficeId(event.target.value)}>{offices.map((office) => <option key={office.id} value={office.id}>{office.name}</option>)}</select><span className="settings-field-help">Policies below apply to this office.</span></label><fieldset className="settings-fieldset"><legend>Working hours</legend><div className="settings-field-grid"><label className="text-sm">Start time<input required type="time" value={form.office_start_time} onChange={(event) => setValue("office_start_time", event.target.value)} className="app-form-control mt-1" /></label><label className="text-sm">End time<input required type="time" value={form.office_end_time} onChange={(event) => setValue("office_end_time", event.target.value)} className="app-form-control mt-1" /></label></div></fieldset><fieldset className="settings-fieldset"><legend>Attendance policy</legend><div className="settings-field-grid"><NumberField label="Grace period (minutes)" value={form.grace_period_minutes} onChange={(value) => setValue("grace_period_minutes", value)} /><NumberField label="Minimum working minutes" value={form.minimum_working_minutes} onChange={(value) => setValue("minimum_working_minutes", value)} /><NumberField label="Half-day threshold (minutes)" value={form.half_day_after_minutes} onChange={(value) => setValue("half_day_after_minutes", value)} /><label className="settings-checkbox"><input type="checkbox" checked={form.overtime_enabled} onChange={(event) => setValue("overtime_enabled", event.target.checked)} /> Enable overtime</label></div></fieldset><fieldset className="settings-fieldset"><legend>Working days</legend><div className="settings-days">{days.map(([value, label]) => <label key={value} className="settings-checkbox"><input type="checkbox" checked={form.working_days.includes(value)} onChange={(event) => setValue("working_days", event.target.checked ? [...form.working_days, value].sort() : form.working_days.filter((day) => day !== value))} />{label}</label>)}</div></fieldset></>;
}

function WfhSettings({ form, setValue }: { form: FormValues; setValue: SetValue }) {
  return <fieldset className="settings-fieldset"><legend>Work from home requirements</legend><p className="settings-field-help">Choose the safeguards required when employees work remotely.</p><div className="settings-checkbox-grid">{([['wfh_enabled', 'Enable WFH'], ['wfh_gps_required', 'Require GPS'], ['wfh_photo_required', 'Require selfie'], ['wfh_approval_required', 'Require approval'], ['wfh_tracking_enabled', 'Enable live tracking']] as const).map(([key, label]) => <label key={key} className="settings-checkbox"><input type="checkbox" checked={form[key]} onChange={(event) => setValue(key, event.target.checked)} />{label}</label>)}</div></fieldset>;
}

function LocationSettings({ form, setValue }: { form: FormValues; setValue: SetValue }) {
  return <fieldset className="settings-fieldset"><legend>Location & tracking</legend><p className="settings-field-help">Set the accuracy threshold and interval used for location tracking.</p><div className="settings-field-grid"><NumberField label="GPS accuracy threshold (meters)" value={form.gps_accuracy_threshold_meters} onChange={(value) => setValue("gps_accuracy_threshold_meters", value)} /><NumberField label="Location tracking interval (seconds, 30–300)" value={form.location_tracking_interval_seconds} min={30} max={300} onChange={(value) => setValue("location_tracking_interval_seconds", value)} /></div></fieldset>;
}

function NumberField({ label, value, onChange, min, max }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number }) {
  return <label className="text-sm">{label}<input required type="number" value={value} min={min} max={max} onChange={(event) => onChange(Number(event.target.value))} className="app-form-control mt-1" /></label>;
}
