'use client'

import { Check, Copy, Download, FileUp, Layers, Lock, Pencil, Plus, Trash2 } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { cn } from '@/lib/utils'
import { CURVE_OPTIONS, DEFAULT_SETTINGS } from '@/lib/spacemouse/constants'
import type { DeviceSettings, Profile } from '@/lib/spacemouse/types'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useControlCenter } from '../control-center-provider'
import { ActionButton, SectionHeader } from '../ui-kit'

type DialogState = { mode: 'create' } | { mode: 'edit'; profile: Profile } | null

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'profile'
}

function isSettings(value: unknown): value is DeviceSettings {
  if (!value || typeof value !== 'object') return false
  const s = value as Record<string, unknown>
  return typeof s.sensitivity === 'number' && typeof s.deadZone === 'number' && typeof s.smoothing === 'number'
}

function normaliseImported(raw: unknown): Profile[] {
  const list = Array.isArray(raw) ? raw : [raw]
  return list
    .filter((p): p is Record<string, unknown> => !!p && typeof p === 'object')
    .filter((p) => typeof p.name === 'string' && isSettings(p.settings))
    .map((p) => {
      const settings = p.settings as DeviceSettings
      return {
        id: '',
        name: String(p.name).slice(0, 48),
        description: typeof p.description === 'string' ? p.description.slice(0, 120) : '',
        builtIn: false,
        settings: {
          ...DEFAULT_SETTINGS,
          ...settings,
          axes: { ...DEFAULT_SETTINGS.axes, ...(settings.axes ?? {}) },
        },
      }
    })
}

function ProfileDialog({ state, onClose }: { state: DialogState; onClose: () => void }) {
  const { createProfile, updateProfileMeta } = useControlCenter()
  const editing = state?.mode === 'edit' ? state.profile : null

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const name = String(form.get('name') ?? '').trim()
    const description = String(form.get('description') ?? '').trim()
    if (!name) return
    if (editing) updateProfileMeta(editing.id, { name, description })
    else createProfile({ name, description })
    onClose()
  }

  const inputClass =
    'mt-1.5 h-9 w-full rounded-md border border-line bg-[#121515] px-3 text-[12.5px] text-ink outline-none placeholder:text-ink-subtle focus-visible:ring-2 focus-visible:ring-ember/60'

  return (
    <Dialog open={state !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-0 border border-line bg-panel p-0 ring-0 sm:max-w-md">
        <form onSubmit={onSubmit} key={editing?.id ?? 'new'}>
          <div className="border-b border-line p-5 pr-12">
            <DialogTitle className="text-[15px] font-semibold text-ink">{editing ? 'Edit profile' : 'New profile'}</DialogTitle>
            <DialogDescription className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
              {editing ? 'Rename or describe this profile.' : 'Creates a profile from the current device settings and activates it.'}
            </DialogDescription>
          </div>
          <div className="flex flex-col gap-4 p-5">
            <div>
              <label htmlFor="profile-name" className="text-[12px] font-medium text-ink">
                Name
              </label>
              <input id="profile-name" name="name" required maxLength={48} defaultValue={editing?.name} placeholder="e.g. CAD Modelling" className={inputClass} autoFocus />
            </div>
            <div>
              <label htmlFor="profile-description" className="text-[12px] font-medium text-ink">
                Description
              </label>
              <input id="profile-description" name="description" maxLength={120} defaultValue={editing?.description} placeholder="What is this profile for?" className={inputClass} />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-line p-4">
            <DialogClose className="h-9 rounded-md border border-line bg-panel-2 px-4 text-[12px] font-medium text-ink outline-none transition-colors hover:bg-[#262a2b] focus-visible:ring-2 focus-visible:ring-ember/60">
              Cancel
            </DialogClose>
            <ActionButton type="submit" variant="primary">
              {editing ? 'SAVE' : 'CREATE PROFILE'}
            </ActionButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-line/50 bg-canvas/50 px-2 py-1.5">
      <p className="text-[9px] tracking-[0.14em] text-ink-subtle">{label}</p>
      <p className="mt-0.5 font-mono text-[12px] tabular-nums text-ink">{value}</p>
    </div>
  )
}

function ProfileCard({ profile, active, onEdit }: { profile: Profile; active: boolean; onEdit: () => void }) {
  const { activateProfile, duplicateProfile, deleteProfile } = useControlCenter()
  const s = profile.settings
  const curve = CURVE_OPTIONS.find((c) => c.id === s.curve)?.label ?? s.curve
  const disabledAxes = Object.values(s.axes).filter((a) => !a.enabled).length

  return (
    <article
      className={cn(
        'surface-panel flex flex-col rounded-lg border p-4 transition-colors',
        active ? 'border-ember/50 shadow-[0_0_0_1px_rgb(255_106_36/0.15)]' : 'border-line/70',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 truncate text-[14px] font-semibold text-ink">
            {profile.name}
            {profile.builtIn && <Lock className="size-3 shrink-0 text-ink-subtle" aria-label="Built-in profile" />}
          </h3>
          <p className="mt-1 truncate text-[11.5px] text-ink-muted">{profile.description || 'No description'}</p>
        </div>
        {active && (
          <span className="flex shrink-0 items-center gap-1 rounded-sm border border-ember/30 bg-ember/10 px-2 py-1 text-[9.5px] font-semibold tracking-[0.12em] text-ember-glow">
            <Check className="size-3" aria-hidden="true" />
            ACTIVE
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-1.5">
        <Metric label="SENS" value={`${s.sensitivity}%`} />
        <Metric label="DEAD ZONE" value={`${s.deadZone}%`} />
        <Metric label="SMOOTH" value={`${s.smoothing}%`} />
        <Metric label="CURVE" value={curve} />
        <Metric label="RATE" value={`${s.pollingRate} Hz`} />
        <Metric label="AXES" value={`${6 - disabledAxes}/6`} />
      </div>

      <div className="mt-4 flex items-center gap-1 border-t border-line/60 pt-3">
        <ActionButton size="sm" variant={active ? 'secondary' : 'primary'} disabled={active} onClick={() => activateProfile(profile.id)}>
          {active ? 'IN USE' : 'ACTIVATE'}
        </ActionButton>
        <div className="ml-auto flex items-center gap-0.5">
          {!profile.builtIn && (
            <IconAction label={`Edit ${profile.name}`} icon={Pencil} onClick={onEdit} />
          )}
          <IconAction label={`Duplicate ${profile.name}`} icon={Copy} onClick={() => duplicateProfile(profile.id)} />
          <IconAction
            label={`Export ${profile.name}`}
            icon={Download}
            onClick={() => downloadJson(`${slug(profile.name)}.spacemouse.json`, { name: profile.name, description: profile.description, settings: profile.settings })}
          />
          {!profile.builtIn && (
            <IconAction label={`Delete ${profile.name}`} icon={Trash2} danger onClick={() => deleteProfile(profile.id)} />
          )}
        </div>
      </div>
    </article>
  )
}

function IconAction({ label, icon: Icon, onClick, danger }: { label: string; icon: typeof Copy; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'flex size-8 items-center justify-center rounded-md text-ink-subtle outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ember/60',
        danger ? 'hover:bg-status-error/10 hover:text-status-error' : 'hover:bg-panel-2 hover:text-ink',
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
    </button>
  )
}

export function ProfilesSection() {
  const { profiles, activeProfile, importProfiles, notify, isDirty } = useControlCenter()
  const [dialog, setDialog] = useState<DialogState>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const onImport = async (file: File | undefined) => {
    if (!file) return
    try {
      const parsed = normaliseImported(JSON.parse(await file.text()))
      if (parsed.length === 0) throw new Error('No valid profiles in file')
      importProfiles(parsed)
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Import failed', 'error')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        icon={Layers}
        eyebrow="PROFILES"
        title="Configuration Profiles"
        description="Switch between tuned response presets for different applications. Built-in profiles can be duplicated; custom profiles can be edited, exported and shared."
        actions={
          <>
            <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => onImport(e.target.files?.[0])} />
            <ActionButton icon={FileUp} onClick={() => fileRef.current?.click()}>
              IMPORT
            </ActionButton>
            <ActionButton
              icon={Download}
              onClick={() =>
                downloadJson(
                  'spacemouse-profiles.json',
                  profiles.map((p) => ({ name: p.name, description: p.description, settings: p.settings })),
                )
              }
            >
              EXPORT ALL
            </ActionButton>
            <ActionButton variant="primary" icon={Plus} onClick={() => setDialog({ mode: 'create' })}>
              NEW PROFILE
            </ActionButton>
          </>
        }
      />

      {isDirty && (
        <p className="rounded-md border border-status-warn/20 bg-[#2a1d12]/60 px-3 py-2 text-[11.5px] text-status-warn">
          {`"${activeProfile.name}" has unsaved changes in Device Settings. Activating another profile will discard them.`}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {profiles.map((p) => (
          <ProfileCard key={p.id} profile={p} active={p.id === activeProfile.id} onEdit={() => setDialog({ mode: 'edit', profile: p })} />
        ))}
        <button
          type="button"
          onClick={() => setDialog({ mode: 'create' })}
          className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-panel/40 text-ink-subtle outline-none transition-colors hover:border-ember/50 hover:text-ink-muted focus-visible:ring-2 focus-visible:ring-ember/60"
        >
          <Plus className="size-5" aria-hidden="true" />
          <span className="text-[12px] font-medium">Create from current settings</span>
        </button>
      </div>

      <ProfileDialog state={dialog} onClose={() => setDialog(null)} />
    </div>
  )
}
