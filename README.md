# Industrial Cafe and Kebabs

Secure staff admin dashboard, POS integration architecture, notification scaffolding, and Supabase database schema for online ordering.

## What is included

- React/Vite staff admin dashboard with Supabase Auth gate.
- Staff order management:
  - View all orders.
  - View pickup and delivery orders separately.
  - Accept or reject orders.
  - Update order status.
  - View customer details and loyalty points.
- Menu management:
  - View menu items.
  - Add, edit, and delete menu items.
  - Change item availability.
  - Change item price.
  - Mark items out of stock.
- Daily sales summary cards.
- POS architecture in `integrations/pos`.
- Mock POS sync buttons:
  - Sync menu from POS.
  - Push order to POS.
  - Sync stock availability.
- Email/SMS-ready notification structure in `notifications`.
- Supabase schema in `supabase/schema.sql`.

## Project structure

```text
integrations/pos/
  posTypes.ts
  posProvider.ts
  squareAdapter.ts
  lightspeedAdapter.ts
  mockPosAdapter.ts
notifications/
  emailProviders.ts
  notificationService.ts
  notificationTypes.ts
  smsProviders.ts
  templates.ts
src/
  components/
  lib/
  types/
supabase/
  schema.sql
```

## Local setup

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Run a production build:

```bash
npm run build
```

The dashboard runs in local demo mode if Supabase environment variables are not configured. Demo mode is for development only.

## Environment variables

Create `.env.local` for local development:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Future server-side notification/POS variables
RESEND_API_KEY=
SENDGRID_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_PHONE=
SQUARE_ACCESS_TOKEN=
SQUARE_LOCATION_ID=
LIGHTSPEED_CLIENT_ID=
LIGHTSPEED_CLIENT_SECRET=
LIGHTSPEED_ACCOUNT_ID=
POS_PROVIDER=mock
```

Do not expose service-role Supabase keys or POS secrets in client-side Vite variables. Move real notification and POS calls behind serverless functions or an API service before production.

## Supabase database setup

1. Create a Supabase project.
2. Open the Supabase SQL editor.
3. Run `supabase/schema.sql`.
4. Create staff users in Supabase Auth.
5. Insert corresponding rows into `public.users` with `role` set to `staff`, `manager`, or `admin`.

Example staff profile insert:

```sql
insert into public.users (id, email, full_name, role)
values (
  'AUTH_USER_UUID_HERE',
  'manager@example.com',
  'Cafe Manager',
  'manager'
);
```

The schema enables row-level security. Staff roles can manage orders, menu items, customers, loyalty, delivery zones, discount codes, and POS logs. Customers can view and manage only their own profile, cart, orders, loyalty, and rewards where applicable.

## Admin dashboard security model

- `src/components/AuthGate.tsx` requires Supabase Auth when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are present.
- Signed-in users must have a `public.users.role` of `staff`, `manager`, or `admin`.
- Database RLS policies in `supabase/schema.sql` enforce the same role checks through `public.is_staff()`.
- The current dashboard uses local mock data for UI behavior. Replace mock data reads/writes with Supabase queries once production data flows are ready.

## POS integration steps

The POS layer is intentionally provider-based:

- `posTypes.ts` defines the shared adapter contract.
- `posProvider.ts` selects an adapter by provider id and dispatches webhook events.
- `mockPosAdapter.ts` powers the current dashboard buttons.
- `squareAdapter.ts` and `lightspeedAdapter.ts` are placeholders for real API calls.

Supported adapter capabilities:

- Sync menu from POS to website.
- Sync price changes from POS.
- Sync availability changes from POS.
- Push online orders to POS.
- Update loyalty from future in-store purchases.
- Handle future webhook events.

Future production work:

1. Move adapter execution to a server/API layer so POS credentials are never shipped to the browser.
2. Implement Square catalog, inventory, order, customer, and webhook calls in `squareAdapter.ts`.
3. Implement Lightspeed menu, stock, order, customer, and webhook calls in `lightspeedAdapter.ts`.
4. Persist sync attempts to `public.pos_sync_logs`.
5. Map provider item ids to `menu_items.pos_external_id`.
6. Map POS customer ids to `loyalty_accounts.pos_customer_id`.
7. Add idempotency keys for order pushes and webhook handling.

## Notifications

`notifications/notificationService.ts` prepares order lifecycle notifications for:

- Order placed.
- Order confirmed.
- Ready for pickup.
- Out for delivery.
- Delivered.
- Picked up.

Provider placeholders are available for:

- Resend.
- SendGrid.
- Twilio.

Before production, call these providers only from a trusted server/API context and store API keys as server-side secrets.
