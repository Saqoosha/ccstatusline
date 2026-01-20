import type { RenderContext } from '../types/RenderContext';
import type { Settings } from '../types/Settings';
import type {
    CustomKeybind,
    Widget,
    WidgetEditorDisplay,
    WidgetItem
} from '../types/Widget';
import { getContextConfig } from '../utils/model-context';

type DisplayMode = 'text' | 'progress' | 'progress-short';

export class ContextPercentageUsableWidget implements Widget {
    getDefaultColor(): string { return 'green'; }
    getDescription(): string { return 'Shows percentage of usable context window used or remaining (80% of max before auto-compact)'; }
    getDisplayName(): string { return 'Context % (usable)'; }
    getEditorDisplay(item: WidgetItem): WidgetEditorDisplay {
        const isInverse = item.metadata?.inverse === 'true';
        const mode = (item.metadata?.display ?? 'text') as DisplayMode;
        const modifiers: string[] = [];

        if (isInverse) {
            modifiers.push('remaining');
        }
        if (mode === 'progress') {
            modifiers.push('progress bar');
        } else if (mode === 'progress-short') {
            modifiers.push('short bar');
        }

        return {
            displayText: this.getDisplayName(),
            modifierText: modifiers.length > 0 ? `(${modifiers.join(', ')})` : undefined
        };
    }

    handleEditorAction(action: string, item: WidgetItem): WidgetItem | null {
        if (action === 'toggle-inverse') {
            const currentState = item.metadata?.inverse === 'true';
            return {
                ...item,
                metadata: {
                    ...item.metadata,
                    inverse: (!currentState).toString()
                }
            };
        }
        if (action === 'toggle-progress') {
            const currentMode = (item.metadata?.display ?? 'text') as DisplayMode;
            let nextMode: DisplayMode;
            if (currentMode === 'text') {
                nextMode = 'progress';
            } else if (currentMode === 'progress') {
                nextMode = 'progress-short';
            } else {
                nextMode = 'text';
            }
            return {
                ...item,
                metadata: { ...item.metadata, display: nextMode }
            };
        }
        return null;
    }

    render(item: WidgetItem, context: RenderContext, settings: Settings): string | null {
        const isInverse = item.metadata?.inverse === 'true';
        const displayMode = (item.metadata?.display ?? 'text') as DisplayMode;

        if (context.isPreview) {
            const percentage = isInverse ? 88.4 : 11.6;
            if (displayMode === 'progress' || displayMode === 'progress-short') {
                const barWidth = displayMode === 'progress' ? 32 : 16;
                const progress = percentage / 100;
                const filledWidth = Math.floor(progress * barWidth);
                const emptyWidth = barWidth - filledWidth;
                const progressBar = '█'.repeat(filledWidth) + '░'.repeat(emptyWidth);
                const prefix = item.rawValue ? '' : 'Ctx(u) ';
                return `${prefix}[${progressBar}] ${percentage.toFixed(1)}%`;
            }
            const previewValue = `${percentage.toFixed(1)}%`;
            return item.rawValue ? previewValue : `Ctx(u): ${previewValue}`;
        } else if (context.tokenMetrics) {
            const modelId = context.data?.model?.id;
            const contextConfig = getContextConfig(modelId);
            const usedPercentage = Math.min(100, (context.tokenMetrics.contextLength / contextConfig.usableTokens) * 100);
            const displayPercentage = isInverse ? (100 - usedPercentage) : usedPercentage;
            if (displayMode === 'progress' || displayMode === 'progress-short') {
                const barWidth = displayMode === 'progress' ? 32 : 16;
                const progress = displayPercentage / 100;
                const filledWidth = Math.floor(progress * barWidth);
                const emptyWidth = barWidth - filledWidth;
                const progressBar = '█'.repeat(filledWidth) + '░'.repeat(emptyWidth);
                const prefix = item.rawValue ? '' : 'Ctx(u) ';
                return `${prefix}[${progressBar}] ${displayPercentage.toFixed(1)}%`;
            }
            return item.rawValue ? `${displayPercentage.toFixed(1)}%` : `Ctx(u): ${displayPercentage.toFixed(1)}%`;
        }
        return null;
    }

    getCustomKeybinds(): CustomKeybind[] {
        return [
            { key: 'l', label: '(l)eft/remaining', action: 'toggle-inverse' },
            { key: 'p', label: '(p)rogress toggle', action: 'toggle-progress' }
        ];
    }

    supportsRawValue(): boolean { return true; }
    supportsColors(item: WidgetItem): boolean { return true; }
}