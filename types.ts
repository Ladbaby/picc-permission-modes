export type PermissionMode =
  | "default"
  | "acceptEdits"
  | "plan"
  | "bypassPermissions"
  | "auto";
export type InternalPermissionMode = PermissionMode;
export const PERMISSION_MODES = [
  "default",
  "acceptEdits",
  "plan",
  "bypassPermissions",
  "auto",
] as const;
export const INTERNAL_PERMISSION_MODES = PERMISSION_MODES;
export type PermissionBehavior = "allow" | "deny" | "ask";
export type PermissionRuleSource =
  | "userSettings"
  | "projectSettings"
  | "localSettings"
  | "flagSettings"
  | "policySettings"
  | "cliArg"
  | "command"
  | "session";
export const ALL_PERMISSION_RULE_SOURCES: PermissionRuleSource[] = [
  "userSettings",
  "projectSettings",
  "localSettings",
  "flagSettings",
  "policySettings",
  "cliArg",
  "command",
  "session",
];
export interface PermissionRuleValue {
  toolName: string;
  ruleContent?: string;
}
export interface AllowedPrompt {
  tool: "Bash";
  prompt: string;
}
export interface PermissionRule {
  source: PermissionRuleSource;
  ruleBehavior: PermissionBehavior;
  ruleValue: PermissionRuleValue;
}
export type ToolPermissionRulesBySource = Partial<
  Record<PermissionRuleSource, string[]>
>;
export type PermissionUpdateDestination =
  | "userSettings"
  | "projectSettings"
  | "localSettings"
  | "session"
  | "cliArg";
export type PermissionUpdate =
  | {
      type: "addRules";
      destination: PermissionUpdateDestination;
      rules: PermissionRuleValue[];
      behavior: PermissionBehavior;
    }
  | {
      type: "replaceRules";
      destination: PermissionUpdateDestination;
      rules: PermissionRuleValue[];
      behavior: PermissionBehavior;
    }
  | {
      type: "removeRules";
      destination: PermissionUpdateDestination;
      rules: PermissionRuleValue[];
      behavior: PermissionBehavior;
    }
  | {
      type: "setMode";
      destination: PermissionUpdateDestination;
      mode: PermissionMode;
    }
  | {
      type: "addDirectories";
      destination: PermissionUpdateDestination;
      directories: string[];
    }
  | {
      type: "removeDirectories";
      destination: PermissionUpdateDestination;
      directories: string[];
    };
export interface AdditionalWorkingDirectory {
  path: string;
  source: "userSettings" | "projectSettings" | "localSettings" | "flagSettings" | "policySettings" | "cliArg" | "command" | "session";
}
export interface ToolPermissionContext {
  readonly mode: PermissionMode;
  readonly additionalWorkingDirectories: ReadonlyMap<
    string,
    AdditionalWorkingDirectory
  >;
  readonly alwaysAllowRules: ToolPermissionRulesBySource;
  readonly alwaysDenyRules: ToolPermissionRulesBySource;
  readonly alwaysAskRules: ToolPermissionRulesBySource;
  readonly isBypassPermissionsModeAvailable: boolean;
  readonly strippedDangerousRules?: ToolPermissionRulesBySource;
  readonly shouldAvoidPermissionPrompts?: boolean;
  readonly prePlanMode?: PermissionMode;
  readonly shouldStripDangerousRules?: boolean;
}
export type PermissionDecisionReason =
  | { type: "rule"; rule: { toolName: string; ruleContent?: string; source: PermissionRuleSource; ruleBehavior: PermissionBehavior } }
  | { type: "mode"; mode: PermissionMode }
  | { type: "subcommandResults"; reasons: Map<string, PermissionResult> }
  | { type: "permissionPromptTool"; permissionPromptToolName: string; toolResult: unknown }
  | { type: "hook"; hookName: string; reason?: string }
  | { type: "asyncAgent"; reason: string }
  | { type: "safetyCheck"; reason: string; classifierApprovable: boolean }
  | { type: "workingDir"; reason: string }
  | { type: "other"; reason: string };
export interface PermissionAllowDecision {
  behavior: "allow";
  updatedInput?: unknown;
  userModified?: boolean;
  decisionReason?: PermissionDecisionReason;
  toolUseID?: string;
}
export interface PermissionAskDecision {
  behavior: "ask";
  message: string;
  updatedInput?: unknown;
  decisionReason?: PermissionDecisionReason;
  suggestions?: PermissionUpdate[];
  blockedPath?: string;
  isBashSecurityCheckForMisparsing?: boolean;
}
export interface PermissionDenyDecision {
  behavior: "deny";
  message: string;
  decisionReason: PermissionDecisionReason;
  toolUseID?: string;
}
export type PermissionDecision =
  | PermissionAllowDecision
  | PermissionAskDecision
  | PermissionDenyDecision;
export type PermissionResult =
  | PermissionDecision
  | {
      behavior: "passthrough";
      message: string;
      decisionReason?: PermissionDecisionReason;
      suggestions?: PermissionUpdate[];
      blockedPath?: string;
    };
export interface ModesPersistedEntry {
  mode: PermissionMode;
  additionalWorkingDirectories: Array<[string, AdditionalWorkingDirectory]>;
  alwaysAllowRules: ToolPermissionRulesBySource;
  alwaysDenyRules: ToolPermissionRulesBySource;
  alwaysAskRules: ToolPermissionRulesBySource;
  isBypassPermissionsModeAvailable: boolean;
  prePlanMode?: PermissionMode;
  shouldAvoidPermissionPrompts?: boolean;
  needsPlanModeExitAttachment?: boolean;
  planModeAttachmentCount?: number;
  planSlug?: string;
}
export type ModeColorKey =
  | "text"
  | "muted"
  | "accent"
  | "warning"
  | "error"
  | "success"
  | "dim";
export interface RgbColor {
  r: number;
  g: number;
  b: number;
}
/** Which background a mode color is meant to sit on. */
export type ModeAppearance = "dark" | "light";
export interface ModeMeta {
  title: string;
  shortTitle: string;
  symbol: string;
  /** Nearest pi theme token, used when the terminal has no truecolor. */
  color: ModeColorKey;
  /** Claude Code's exact colors for this mode, per theme appearance. */
  palette: Record<ModeAppearance, RgbColor>;
}
/* Colors mirror Claude Code's `utils/permissions/PermissionMode.ts`
 * PERMISSION_MODE_CONFIG (default=text, plan=planMode, acceptEdits=autoAccept,
 * bypassPermissions=error, auto=warning) resolved against the themes in its
 * `utils/theme.ts`, where the tokens are declared as `rgb()` literals:
 * dark  -> autoAccept rgb(175,135,255), planMode rgb(72,150,140),
 *          error rgb(255,107,128), warning rgb(255,193,7), text rgb(255,255,255)
 * light -> autoAccept rgb(135,0,255), planMode rgb(0,102,102),
 *          error rgb(171,43,63), warning rgb(150,108,30), text rgb(0,0,0) */
export const MODE_META: Record<PermissionMode, ModeMeta> = {
  default: {
    title: "Default",
    shortTitle: "Default",
    symbol: "",
    color: "text",
    palette: {
      dark: { r: 0xff, g: 0xff, b: 0xff }, // rgb(255,255,255)
      light: { r: 0x00, g: 0x00, b: 0x00 }, // rgb(0,0,0)
    },
  },
  acceptEdits: {
    title: "Accept edits",
    shortTitle: "Accept",
    symbol: "⏵⏵",
    color: "success",
    palette: {
      dark: { r: 0xaf, g: 0x87, b: 0xff }, // rgb(175,135,255)
      light: { r: 0x87, g: 0x00, b: 0xff }, // rgb(135,0,255)
    },
  },
  plan: {
    title: "Plan Mode",
    shortTitle: "Plan",
    symbol: "⏸",
    color: "accent",
    palette: {
      dark: { r: 0x48, g: 0x96, b: 0x8c }, // rgb(72,150,140)
      light: { r: 0x00, g: 0x66, b: 0x66 }, // rgb(0,102,102)
    },
  },
  bypassPermissions: {
    title: "Bypass Permissions",
    shortTitle: "Bypass",
    symbol: "⏵⏵",
    color: "error",
    palette: {
      dark: { r: 0xff, g: 0x6b, b: 0x80 }, // rgb(255,107,128)
      light: { r: 0xab, g: 0x2b, b: 0x3f }, // rgb(171,43,63)
    },
  },
  auto: {
    title: "Auto mode",
    shortTitle: "Auto",
    symbol: "⏵⏵",
    color: "warning",
    palette: {
      dark: { r: 0xff, g: 0xc1, b: 0x07 }, // rgb(255,193,7)
      light: { r: 0x96, g: 0x6c, b: 0x1e }, // rgb(150,108,30)
    },
  },
};
export function modeRgb(
  mode: PermissionMode,
  appearance: ModeAppearance = "dark",
): RgbColor {
  return MODE_META[mode].palette[appearance];
}
export function modeHex(
  mode: PermissionMode,
  appearance: ModeAppearance = "dark",
): string {
  const { r, g, b } = modeRgb(mode, appearance);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
export const PAUSE_ICON = "\u23f8";
export const PLAY_ICON = "\u25b6";
