'use client'

import { DatabaseBackup, Download, FileUp, FileWarning, History, RotateCcw, Save, Trash2 } from 'lucide-react'
import { useMemo, useRef } from 'react'
import { CONFIG_SCHEMA_VERSION, validateConfig, type BackupReason } from '@/lib/config/schema'
import { downloadJson } from '@/lib/download'
import { useConfirm } from '../confirm-dialog'
import { useControlCenter } from '../control-center-provider'
import { ActionButton, Panel, SectionHeader, StatTile } from '../ui-kit'

const REASON_LABELS: Record<BackupReason, string> = {
  manual: 'Manual backup',
  auto: 'Daily snapshot',
  'before-restore': 'Before restore',
  'before-import': 'Before import',
  'before-reset': 'Before reset',
}

const STATUS_LABELS = {
  loading: 'Loading',
  saving: 'Saving',
  saved: 'Saved',
  error: 'Error',
  unavailable: 'Unavailable',
} as const

function stamp() {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
}

export function ConfigurationSection() {
  const {
    persistence,
    backups,
    corrupt,
    profiles,
    calibration,
    buildConfig,
    createBackup,
    deleteBackup,
    restoreBackup,
    importConfig,
    resetAll,
    discardCorrupt,
    notify,
    hydrated,
  } = useControlCenter()
  const confirm = useConfirm()
  const fileRef = useRef<HTMLInputElement>(null)

  const sizeKb = useMemo(
    () => (new Blob([JSON.stringify({ profiles, calibration })]).size / 1024).toFixed(1),
    [profiles, calibration],
  )
  const customProfiles = profiles.filter((p) => !p.builtIn).length

  const onImport = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return
    let parsed: unknown
    try {
      parsed = JSON.parse(await file.text())
    } catch {
      notify('Import failed: file is not valid JSON', 'error')
      return
    }
    const result = validateConfig(parsed)
    if (!result.ok) {
      notify(`Import failed: ${result.errors[0]}`, 'error')
      return
    }
    const ok = await confirm({
      title: 'Replace current configuration?',
      description: `"${file.name}" contains ${result.value.profiles.length} profiles.${
        result.warnings.length ? ` ${result.warnings.length} value(s) will be corrected on import.` : ''
      } Your current configuration is backed up first and can be restored from the list below.`,
      confirmLabel: 'IMPORT',
      tone: 'default',
    })
    if (ok) await importConfig(result.value)
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        icon={DatabaseBackup}
        eyebrow="CONFIGURATION MANAGER"
        title="Storage & Backups"
        description="Every change is saved automatically to this browser. Export a file to move your setup to another machine, or restore an earlier backup."
        actions={
          <>
            <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => onImport(e.target.files?.[0])} />
            <ActionButton icon={FileUp} onClick={() => fileRef.current?.click()} disabled={!hydrated}>
              IMPORT
            </ActionButton>
            <ActionButton icon={Download} onClick={() => downloadJson(`spacemouse-config-${stamp()}.json`, buildConfig())}>
              EXPORT
            </ActionButton>
            <ActionButton variant="primary" icon={Save} onClick={() => createBackup('manual')} disabled={!hydrated || persistence.status === 'unavailable'}>
              CREATE BACKUP
            </ActionButton>
          </>
        }
      />

      {corrupt && (
        <div role="alert" className="flex flex-col gap-3 rounded-lg border border-status-warn/30 bg-[#2a1d12]/60 p-4 md:flex-row md:items-center">
          <FileWarning className="size-5 shrink-0 text-status-warn" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-semibold text-status-warn">Damaged configuration recovered</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-muted">
              {`On ${new Date(corrupt.detectedAt).toLocaleString()} the stored configuration failed validation (${corrupt.errors[0] ?? 'unknown error'}). Defaults were loaded and the original was preserved.`}
            </p>
          </div>
          <div className="flex gap-2">
            <ActionButton size="sm" icon={Download} onClick={() => downloadJson(`spacemouse-damaged-${stamp()}.json`, corrupt.raw)}>
              DOWNLOAD COPY
            </ActionButton>
            <ActionButton
              size="sm"
              variant="danger"
              icon={Trash2}
              onClick={async () => {
                if (await confirm({ title: 'Discard damaged copy?', description: 'The preserved copy of the invalid configuration will be permanently deleted.', confirmLabel: 'DISCARD' }))
                  await discardCorrupt()
              }}
            >
              DISCARD
            </ActionButton>
          </div>
        </div>
      )}

      <Panel title="STORAGE" meta="INDEXEDDB · LOCAL">
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          <StatTile
            label="STATUS"
            value={STATUS_LABELS[persistence.status]}
            tone={persistence.status === 'saved' ? 'ok' : persistence.status === 'error' || persistence.status === 'unavailable' ? 'error' : 'default'}
            sub={persistence.error}
          />
          <StatTile label="LAST SAVED" value={persistence.savedAt ? new Date(persistence.savedAt).toLocaleTimeString() : '—'} sub={persistence.savedAt ? new Date(persistence.savedAt).toLocaleDateString() : undefined} />
          <StatTile label="SCHEMA" value={`v${CONFIG_SCHEMA_VERSION}`} sub="Validated on load" />
          <StatTile label="PROFILES" value={profiles.length} sub={`${customProfiles} custom`} />
          <StatTile label="CALIBRATION" value={calibration.calibratedAt ? 'Custom' : 'Factory'} tone={calibration.calibratedAt ? 'ok' : 'default'} />
          <StatTile label="SIZE" value={`${sizeKb} KB`} sub={`${backups.length} backups`} />
        </div>
      </Panel>

      <Panel title="BACKUPS" meta={`${backups.length} / 25 KEPT`}>
        {backups.length === 0 ? (
          <div className="mt-3 flex flex-col items-center gap-2 rounded-md border border-dashed border-line py-10 text-center">
            <History className="size-5 text-ink-subtle" aria-hidden="true" />
            <p className="text-[12px] text-ink-muted">No backups yet</p>
            <p className="max-w-sm text-[11px] text-ink-subtle">
              A daily snapshot is taken on launch, and a backup is created automatically before every restore, import or reset.
            </p>
          </div>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[560px] text-[12px]">
              <thead>
                <tr className="border-b border-line text-left text-[9.5px] tracking-[0.16em] text-ink-subtle">
                  <th scope="col" className="py-2 pr-3 font-medium">CREATED</th>
                  <th scope="col" className="py-2 pr-3 font-medium">TYPE</th>
                  <th scope="col" className="py-2 pr-3 font-medium">PROFILES</th>
                  <th scope="col" className="py-2 pr-3 font-medium">CALIBRATION</th>
                  <th scope="col" className="py-2 text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b) => (
                  <tr key={b.id} className="border-b border-line/50 last:border-0">
                    <td className="py-2 pr-3 font-mono text-[11.5px] text-ink">{new Date(b.createdAt).toLocaleString()}</td>
                    <td className="py-2 pr-3 text-ink-muted">{REASON_LABELS[b.reason]}</td>
                    <td className="py-2 pr-3 font-mono text-ink-muted">{b.config.profiles.length}</td>
                    <td className="py-2 pr-3 text-ink-muted">{b.config.calibration.calibratedAt ? 'Custom' : 'Factory'}</td>
                    <td className="py-2">
                      <div className="flex justify-end gap-1">
                        <ActionButton
                          size="sm"
                          variant="ghost"
                          icon={RotateCcw}
                          onClick={async () => {
                            if (
                              await confirm({
                                title: 'Restore this backup?',
                                description: `Profiles, working settings and calibration will be replaced with the backup from ${new Date(b.createdAt).toLocaleString()}. Your current configuration is backed up first.`,
                                confirmLabel: 'RESTORE',
                                tone: 'default',
                              })
                            )
                              await restoreBackup(b.id)
                          }}
                        >
                          RESTORE
                        </ActionButton>
                        <ActionButton
                          size="sm"
                          variant="ghost"
                          icon={Download}
                          aria-label={`Download backup from ${new Date(b.createdAt).toLocaleString()}`}
                          onClick={() => downloadJson(`spacemouse-backup-${b.createdAt.slice(0, 19).replace(/[:T]/g, '-')}.json`, b.config)}
                        />
                        <ActionButton
                          size="sm"
                          variant="ghost"
                          icon={Trash2}
                          aria-label={`Delete backup from ${new Date(b.createdAt).toLocaleString()}`}
                          onClick={async () => {
                            if (await confirm({ title: 'Delete backup?', description: 'This backup will be permanently removed.', confirmLabel: 'DELETE' })) await deleteBackup(b.id)
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="RESET">
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="max-w-2xl text-[12px] leading-relaxed text-ink-muted">
            Restore built-in profiles, default settings and factory calibration. Custom profiles are removed. A backup is created first, so this can be undone from the list above.
          </p>
          <ActionButton
            variant="danger"
            icon={RotateCcw}
            disabled={!hydrated}
            onClick={async () => {
              if (
                await confirm({
                  title: 'Reset all configuration?',
                  description: `This removes ${customProfiles} custom profile(s), resets calibration and restores default settings. A backup is created first.`,
                  confirmLabel: 'RESET EVERYTHING',
                })
              )
                await resetAll()
            }}
          >
            RESET ALL
          </ActionButton>
        </div>
      </Panel>
    </div>
  )
}
