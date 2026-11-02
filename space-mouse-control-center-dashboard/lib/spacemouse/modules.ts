import {
  Activity,
  AppWindow,
  Compass,
  Crosshair,
  DatabaseBackup,
  DraftingCompass,
  Keyboard,
  LayoutDashboard,
  MousePointerClick,
  Settings2,
  SlidersHorizontal,
  Usb,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

export type ModuleId =
  | 'dashboard'
  | 'device-manager'
  | 'control-mapping'
  | 'profiles'
  | 'cad-integration'
  | 'buttons'
  | 'shortcuts'
  | 'navigation'
  | 'macros'
  | 'calibration'
  | 'diagnostics'
  | 'configuration'
  | 'advanced'

export type ModuleGroup = 'OVERVIEW' | 'CONTROL' | 'DEVICE' | 'SYSTEM'

export interface ModuleDefinition {
  id: ModuleId
  label: string
  href: string
  icon: LucideIcon
  group: ModuleGroup
  /** `available` modules are implemented; `planned` modules only describe their scope. */
  status: 'available' | 'planned'
  /** Delivery stage that builds (or next extends) this module. */
  stage: number
  summary: string
  scope: string[]
  related: ModuleId[]
  keywords: string[]
}

export const MODULES: ModuleDefinition[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    group: 'OVERVIEW',
    status: 'available',
    stage: 2,
    summary: 'Live 6DoF view, quick tuning and device status at a glance.',
    scope: [],
    related: ['calibration', 'control-mapping', 'diagnostics'],
    keywords: ['home', 'overview', '3d', 'live'],
  },
  {
    id: 'device-manager',
    label: 'Device Manager',
    href: '/device-manager',
    icon: Usb,
    group: 'OVERVIEW',
    status: 'available',
    stage: 2,
    summary: 'Connect the Pro Micro, choose the serial link and inspect what the device reports.',
    scope: [],
    related: ['diagnostics', 'calibration'],
    keywords: ['connect', 'usb', 'serial', 'baud', 'port', 'firmware', 'hardware', 'native service'],
  },
  {
    id: 'control-mapping',
    label: 'Control Mapping',
    href: '/control-mapping',
    icon: SlidersHorizontal,
    group: 'CONTROL',
    status: 'available',
    stage: 3,
    summary: 'Response, curve and per-axis enable, invert and scale for all six axes.',
    scope: [
      'Independent sensitivity, speed, deadzone, curve, smoothing and acceleration per axis',
      'Axis scaling, maximum output limit and minimum input threshold per axis',
      'Movement modes: pan, zoom, orbit, fly, object, camera, dominant and combined',
      'Selective disabling, e.g. rotation off while pan and zoom stay active',
      'Saveable control presets and per-control test mode',
    ],
    related: ['navigation', 'diagnostics'],
    keywords: ['axis', 'sensitivity', 'deadzone', 'dead zone', 'curve', 'invert', 'scale', 'smoothing', 'mapping', '6dof'],
  },
  {
    id: 'profiles',
    label: 'Application Profiles',
    href: '/profiles',
    icon: AppWindow,
    group: 'CONTROL',
    status: 'available',
    stage: 4,
    summary: 'Create, duplicate, import and export configuration profiles.',
    scope: [
      'Profile inheritance (e.g. Base CAD → Fusion 360 / SOLIDWORKS / Creo) with override tracking',
      'Propagate base changes to selected child profiles',
      'Executable association, categories and default/fallback profile',
      'Side-by-side profile comparison',
    ],
    related: ['cad-integration', 'configuration'],
    keywords: ['profile', 'preset', 'application', 'import', 'export', 'duplicate'],
  },
  {
    id: 'cad-integration',
    label: 'CAD/CAM Integration',
    href: '/cad-integration',
    icon: DraftingCompass,
    group: 'CONTROL',
    status: 'planned',
    stage: 4,
    summary: 'Editable command catalogues for professional CAD, CAM and 3D modelling software.',
    scope: [
      'CAD: Fusion 360, SOLIDWORKS, PTC Creo, Siemens NX, Inventor, CATIA, AutoCAD, FreeCAD, Onshape',
      '3D: Blender, SketchUp, 3ds Max, Maya, Rhino, Cinema 4D',
      'Adobe, Microsoft, web browsers and custom Windows applications',
      'Per-application commands (Fit, Home, Isometric, Normal To, Reorient…) — every shortcut editable, none assumed',
      'Rotation centre, pivot point and projection preference per application',
    ],
    related: ['profiles', 'shortcuts', 'buttons'],
    keywords: ['fusion', 'solidworks', 'creo', 'nx', 'inventor', 'catia', 'autocad', 'freecad', 'onshape', 'blender', 'rhino', 'maya', 'cad', 'cam'],
  },
  {
    id: 'buttons',
    label: 'Button Configuration',
    href: '/buttons',
    icon: MousePointerClick,
    group: 'CONTROL',
    status: 'planned',
    stage: 6,
    summary: 'Assign single, double and long presses of each physical button per application.',
    scope: [
      'Interactive device diagram with only the buttons your hardware reports',
      'Single, double and long press bindings',
      'Keyboard shortcut, mouse action, application command or macro targets',
      'Different assignments per application profile',
    ],
    related: ['shortcuts', 'macros', 'cad-integration'],
    keywords: ['button', 'press', 'double', 'long', 'assign', 'binding'],
  },
  {
    id: 'shortcuts',
    label: 'Shortcut Manager',
    href: '/shortcuts',
    icon: Keyboard,
    group: 'CONTROL',
    status: 'planned',
    stage: 5,
    summary: 'Record, search and resolve keyboard shortcuts across applications.',
    scope: [
      'Click-to-record with Ctrl, Shift, Alt, Win and function keys',
      'Conflict detection with clear warnings and guided resolution',
      'Search, filter, sort and per-application association',
      'Reset individual or application shortcuts; import and export',
    ],
    related: ['buttons', 'macros', 'cad-integration'],
    keywords: ['shortcut', 'hotkey', 'keyboard', 'key', 'conflict', 'ctrl', 'alt', 'shift'],
  },
  {
    id: 'navigation',
    label: 'Navigation Settings',
    href: '/navigation',
    icon: Compass,
    group: 'CONTROL',
    status: 'planned',
    stage: 6,
    summary: 'Translation, rotation and zoom speeds with a live interactive test scene.',
    scope: [
      'Translation, rotation and zoom speed; overall and per-axis sensitivity',
      'Rotation centre, pivot point, reverse zoom and reverse rotation',
      'Object vs camera navigation, perspective vs orthographic preference',
      'Presets: Precision, Balanced, Fast, Smooth, CAD Professional, Custom',
    ],
    related: ['control-mapping', 'profiles'],
    keywords: ['navigation', 'pan', 'zoom', 'orbit', 'pivot', 'speed', 'fly', 'camera', 'object'],
  },
  {
    id: 'macros',
    label: 'Macros & Automation',
    href: '/macros',
    icon: Workflow,
    group: 'CONTROL',
    status: 'planned',
    stage: 6,
    summary: 'Ordered action sequences triggered by a button or movement.',
    scope: [
      'Visual editor with an ordered list of keyboard, mouse and application actions',
      'Delays, repeats, enable/disable and dry-run testing',
      'Clear flags when a target application does not support a step',
    ],
    related: ['buttons', 'shortcuts'],
    keywords: ['macro', 'automation', 'sequence', 'delay', 'repeat'],
  },
  {
    id: 'calibration',
    label: 'Calibration',
    href: '/calibration',
    icon: Crosshair,
    group: 'DEVICE',
    status: 'available',
    stage: 2,
    summary: 'Guided neutral-offset and range calibration for every axis.',
    scope: [],
    related: ['diagnostics', 'device-manager'],
    keywords: ['calibrate', 'offset', 'zero', 'neutral', 'drift', 'noise', 'mpu6050', 'range'],
  },
  {
    id: 'diagnostics',
    label: 'Diagnostics',
    href: '/diagnostics',
    icon: Activity,
    group: 'DEVICE',
    status: 'available',
    stage: 2,
    summary: 'Raw vs processed signals, link statistics, serial console and self test.',
    scope: [],
    related: ['device-manager', 'calibration'],
    keywords: ['log', 'console', 'raw', 'processed', 'signal', 'self test', 'packets', 'errors', 'rate'],
  },
  {
    id: 'configuration',
    label: 'Configuration Manager',
    href: '/configuration',
    icon: DatabaseBackup,
    group: 'SYSTEM',
    status: 'available',
    stage: 7,
    summary: 'Storage status, backups, restore, import/export and reset of the full configuration.',
    scope: [],
    related: ['profiles', 'advanced'],
    keywords: ['backup', 'restore', 'import', 'export', 'reset', 'storage', 'json', 'schema', 'recovery'],
  },
  {
    id: 'advanced',
    label: 'Advanced Settings',
    href: '/advanced',
    icon: Settings2,
    group: 'SYSTEM',
    status: 'planned',
    stage: 3,
    summary: 'Signal filtering, processing pipeline and native service connection.',
    scope: [
      'Filter selection: none, low-pass or complementary (MPU6050), with cutoff and alpha',
      'Pipeline visualiser: acquisition → calibration → filter → deadzone → mapping → curve → smoothing → output',
      'Native Windows service endpoint, pairing and start/stop (Stage 8)',
      'Global, application, device and temporary setting scopes',
    ],
    related: ['control-mapping', 'device-manager'],
    keywords: ['filter', 'low-pass', 'complementary', 'pipeline', 'service', 'native', 'windows', 'websocket'],
  },
]

export const MODULE_GROUPS: ModuleGroup[] = ['OVERVIEW', 'CONTROL', 'DEVICE', 'SYSTEM']

export function getModule(id: ModuleId): ModuleDefinition {
  const mod = MODULES.find((m) => m.id === id)
  if (!mod) throw new Error(`Unknown module: ${id}`)
  return mod
}

export function moduleForPath(pathname: string): ModuleDefinition {
  if (pathname === '/') return MODULES[0]
  return MODULES.find((m) => m.href !== '/' && pathname.startsWith(m.href)) ?? MODULES[0]
}

/** Individual settings indexed for global search. */
export const SETTINGS_INDEX: { label: string; module: ModuleId; keywords: string }[] = [
  { label: 'Sensitivity', module: 'control-mapping', keywords: 'gain response speed' },
  { label: 'Dead zone', module: 'control-mapping', keywords: 'deadzone threshold ignore' },
  { label: 'Smoothing', module: 'control-mapping', keywords: 'filter jitter' },
  { label: 'Response curve', module: 'control-mapping', keywords: 'linear progressive aggressive' },
  { label: 'Axis enable / invert / scale', module: 'control-mapping', keywords: 'reverse direction axis mapping' },
  { label: 'Dominant axis mode', module: 'control-mapping', keywords: 'single axis' },
  { label: 'Polling rate', module: 'control-mapping', keywords: 'report rate hz' },
  { label: 'Baud rate', module: 'device-manager', keywords: 'serial speed bps' },
  { label: 'Calibration wizard', module: 'calibration', keywords: 'offset zero range' },
  { label: 'Serial console', module: 'diagnostics', keywords: 'log command' },
  { label: 'Backups', module: 'configuration', keywords: 'restore snapshot' },
  { label: 'Reset all configuration', module: 'configuration', keywords: 'factory defaults' },
]
