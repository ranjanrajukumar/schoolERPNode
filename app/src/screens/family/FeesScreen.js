import { Badge, Card, Empty, Heading, Muted, Row, Tile, TileRow, money, niceDate } from '../../ui';
import { ChildScreen } from './ChildContext';

const TONE = { paid: 'green', partial: 'amber', overdue: 'red', unpaid: 'blue' };
const LABEL = { paid: 'Paid', partial: 'Part paid', overdue: 'Overdue', unpaid: 'Unpaid' };

export default function FeesScreen({ back = false }) {
  return (
    <ChildScreen
      back={back}
      title="Fees"
      sub="What is billed, paid and still to pay."
      path={(c) => `/portal/children/${c.id}/fees`}
      render={({ fees, payments }) => {
        const sum = (key) => fees.reduce((total, f) => total + Number(f[key] ?? 0), 0);
        return (
          <>
            <TileRow>
              <Tile label="Billed" value={money(sum('amount'))} tone="blue" />
              <Tile label="Paid" value={money(sum('paidAmount'))} tone="green" />
              <Tile label="To pay" value={money(sum('balance'))} tone={fees.some((f) => f.status === 'overdue') ? 'red' : 'amber'} />
            </TileRow>
            <Card>
              <Heading>Fee items</Heading>
              {fees.length ? fees.map((f) => (
                <Row
                  key={f.id}
                  left={f.title}
                  sub={`${money(f.paidAmount)} of ${money(f.amount)} paid${f.dueDate ? ` · due ${niceDate(f.dueDate)}` : ''}`}
                  right={<Badge text={LABEL[f.status] ?? f.status} tone={TONE[f.status] ?? 'grey'} />}
                />
              )) : <Empty>No fees have been billed yet.</Empty>}
            </Card>
            <Card>
              <Heading>Payments and receipts</Heading>
              {payments.length ? payments.map((p) => (
                <Row key={p.id ?? p.receiptNo} left={money(p.amount)} sub={`${niceDate(p.paidOn)} · ${p.method ?? ''}${p.receiptNo ? ` · Receipt ${p.receiptNo}` : ''}`} />
              )) : <Empty>No payments yet.</Empty>}
              <Muted style={{ marginTop: 8 }}>Pay at the school office or on the school website, then pull down to refresh.</Muted>
            </Card>
          </>
        );
      }}
    />
  );
}
