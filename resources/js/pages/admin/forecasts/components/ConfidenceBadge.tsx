import { Badge, type Tone } from '@/components/ui';
import type { Confidence } from '../types';

const tones: Record<Confidence, { tone: Tone; label: string }> = {
    high: { tone: 'green', label: 'High' },
    medium: { tone: 'blue', label: 'Medium' },
    low: { tone: 'gray', label: 'Low' },
};

export default function ConfidenceBadge({ confidence }: { confidence: Confidence | null }) {
    if (!confidence) {
        return <span className="text-slate-400">—</span>;
    }

    return <Badge tone={tones[confidence].tone}>{tones[confidence].label}</Badge>;
}
