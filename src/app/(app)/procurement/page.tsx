import { db } from '@/lib/db';
import { requireModule } from '@/lib/auth';
import { ActionForm, SubmitButton } from '@/components/forms';
import { Badge, Card, FormGrid, Input, PageHeader, Select, Table, Td } from '@/components/ui';
import { storePurchaseOrder, storeRequisition } from '@/actions/finance';
import { inr0, toInputDate } from '@/lib/format';

export const metadata = { title: 'Procurement & Inventory' };
export const dynamic = 'force-dynamic';

export default async function Procurement() {
  await requireModule('procurement');
  const [vendors, requisitions, orders, inventory, departments] = await Promise.all([
    db.vendor.findMany(),
    db.purchaseRequisition.findMany({ orderBy: { created_at: 'desc' } }),
    db.purchaseOrder.findMany({ include: { vendor: true }, orderBy: { created_at: 'desc' } }),
    db.inventoryItem.findMany(),
    db.department.findMany(),
  ]);
  return (
    <div className="space-y-4">
      <PageHeader title="Procurement, Purchase Orders & Inventory" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Create Purchase Requisition">
          <ActionForm action={storeRequisition}>
            <FormGrid cols={2}>
              <Select label="Department" name="department_id" options={departments.map((d) => ({ value: d.id, label: d.code }))} />
              <Input label="Qty" name="quantity" type="number" defaultValue={1} min={1} />
              <Input label="Item Description *" name="item_description" required />
              <Input label="Estimated Cost (₹) *" name="estimated_cost" type="number" step="0.01" required />
            </FormGrid>
            <SubmitButton>Submit Requisition</SubmitButton>
          </ActionForm>
        </Card>
        <Card title="Issue Purchase Order (PO)">
          <ActionForm action={storePurchaseOrder}>
            <FormGrid cols={2}>
              <Select label="Vendor" name="vendor_id" options={vendors.map((v) => ({ value: v.id, label: v.name }))} />
              <Select label="Requisition" name="purchase_requisition_id" placeholder="Direct PO" options={requisitions.map((r) => ({ value: r.id, label: r.req_no }))} />
              <Input label="Order Date" name="order_date" type="date" defaultValue={toInputDate(new Date())} />
              <Input label="PO Total (₹) *" name="total_amount" type="number" step="0.01" required />
            </FormGrid>
            <SubmitButton>Generate Purchase Order</SubmitButton>
          </ActionForm>
        </Card>
      </div>
      <Card title="Purchase Requisitions & Orders">
        <Table head={['Ref', 'Item / Vendor', 'Amount', 'Status']}>
          {orders.map((o) => <tr key={`po${o.id}`}><Td className="font-mono text-xs">{o.po_no}</Td><Td>{o.vendor.name}</Td><Td>{inr0(o.total_amount)}</Td><Td><Badge>{o.status}</Badge></Td></tr>)}
          {requisitions.map((r) => <tr key={`pr${r.id}`}><Td className="font-mono text-xs">{r.req_no}</Td><Td>{r.item_description} (x{r.quantity})</Td><Td>{inr0(r.estimated_cost)}</Td><Td><Badge>{r.status}</Badge></Td></tr>)}
        </Table>
      </Card>
      <Card title="Department Stock & Lab Inventory">
        <Table head={['Code', 'Item', 'Category', 'Qty']}>
          {inventory.map((i) => <tr key={i.id}><Td className="font-mono text-xs">{i.item_code}</Td><Td>{i.name}</Td><Td>{i.category}</Td><Td>{i.quantity} {i.unit}</Td></tr>)}
        </Table>
      </Card>
    </div>
  );
}
