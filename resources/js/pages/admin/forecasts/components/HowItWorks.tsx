import { Card, CardBody, CardHeader } from '@/components/ui';
import type { ForecastSettings } from '../types';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            <div className="mt-1.5 space-y-1.5 text-sm text-slate-600">{children}</div>
        </div>
    );
}

export default function HowItWorks({ settings }: { settings: ForecastSettings }) {
    return (
        <Card className="mt-6">
            <CardHeader title="How the forecast works" description="A small model trained on this shop’s own sales; nothing leaves the server." />
            <CardBody className="grid gap-6 lg:grid-cols-2">
                <Section title="Inputs">
                    <p>
                        Units sold per product per day over the last {settings.history_days} days, the product’s stock on hand and on open purchase orders,
                        and the supplier’s lead time. Days the product ran out of stock are treated as <em>unknown</em> demand rather than zero, because
                        an empty shelf only shows what was available, not what customers wanted.
                    </p>
                </Section>
                <Section title="Model">
                    <p>
                        Each product gets its own fit: a weekday pattern (for example, more water on Fridays, fewer exercise books) multiplied by a smoothed
                        level with a damped trend. Training picks the smoothing strength that best predicts the next 7 days of sales across the history.
                    </p>
                </Section>
                <Section title="Outputs">
                    <p>Expected units per day for the next 30 days with a likely range, the date stock runs out, and a reorder suggestion.</p>
                    <p>
                        The suggestion reorders when stock plus open orders falls to the <strong>reorder point</strong> (demand over the lead time plus
                        safety stock) and orders up to the <strong>target</strong> (demand over the lead time and a {settings.review_period_days}-day
                        review period plus safety stock). Safety stock is sized from the model’s past error to cover demand about{' '}
                        {Math.round(settings.service_level * 100)}% of the time.
                    </p>
                </Section>
                <Section title="How it is evaluated">
                    <p>
                        Every product is back-tested: the model is retrained without the last {settings.holdout_days} days, asked to predict them, and
                        compared with what actually sold. The score is WAPE (total absolute error ÷ units sold; lower is better), and it is shown next to a
                        plain {settings.baseline_days}-day average so you can see whether the model earns its keep.
                    </p>
                </Section>
                <Section title="Limitations">
                    <ul className="list-disc space-y-1 pl-5">
                        <li>
                            Needs at least {settings.min_history_days} days of in-stock sales; new products show “No sales data” until then.
                        </li>
                        <li>
                            It only knows past sales. Promotions, price changes, holidays like Eid, or a new shop nearby are invisible to it until they show
                            up in the numbers.
                        </li>
                        <li>
                            Slow sellers (around one unit a day or less) are mostly random; expect a high error and lean on the safety stock rather than the
                            daily number.
                        </li>
                        <li>
                            Daily sales are noisy even with perfect knowledge, so the model wins most on the day-to-day pattern; on weekly totals it is
                            only about as good as a recent average.
                        </li>
                        <li>Suggestions assume the supplier’s lead time is accurate and orders are reviewed weekly. Treat them as a starting point.</li>
                    </ul>
                </Section>
            </CardBody>
        </Card>
    );
}
