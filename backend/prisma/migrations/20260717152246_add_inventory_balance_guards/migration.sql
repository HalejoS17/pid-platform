ALTER TABLE inventory.inventory_balances
ADD CONSTRAINT inventory_balances_quantity_nonnegative_check
CHECK (
  quantity_on_hand >= 0
);

ALTER TABLE inventory.inventory_balances
ADD CONSTRAINT inventory_balances_reserved_not_greater_check
CHECK (
  quantity_reserved <= quantity_on_hand
);

ALTER TABLE inventory.inventory_movements
ADD CONSTRAINT inventory_movements_posted_balance_check
CHECK (
  status <> 'POSTED'
  OR balance_quantity_after IS NOT NULL
);

-- =========================================================
-- PID: PURCHASING DOCUMENTS SECURITY
-- =========================================================

REVOKE ALL
ON SCHEMA purchasing
FROM PUBLIC;

GRANT USAGE
ON SCHEMA purchasing
TO pid_app, pid_worker;

REVOKE ALL
ON TABLE
  purchasing.purchase_orders,
  purchasing.purchase_order_items,
  purchasing.goods_receipts,
  purchasing.goods_receipt_items
FROM PUBLIC;

GRANT SELECT, INSERT, UPDATE
ON TABLE
  purchasing.purchase_orders,
  purchasing.purchase_order_items,
  purchasing.goods_receipts,
  purchasing.goods_receipt_items
TO pid_app;

GRANT SELECT
ON TABLE
  purchasing.purchase_orders,
  purchasing.purchase_order_items,
  purchasing.goods_receipts,
  purchasing.goods_receipt_items
TO pid_worker;

REVOKE DELETE
ON TABLE
  purchasing.purchase_orders,
  purchasing.purchase_order_items,
  purchasing.goods_receipts,
  purchasing.goods_receipt_items
FROM pid_app, pid_worker;

-- ---------------------------------------------------------
-- Purchase orders
-- ---------------------------------------------------------

ALTER TABLE purchasing.purchase_orders
ADD CONSTRAINT purchase_orders_currency_code_check
CHECK (
  currency_code ~ '^[A-Z]{3}$'
);

ALTER TABLE purchasing.purchase_orders
ADD CONSTRAINT purchase_orders_expected_date_check
CHECK (
  expected_date IS NULL
  OR expected_date >= order_date
);

ALTER TABLE purchasing.purchase_orders
ADD CONSTRAINT purchase_orders_amounts_nonnegative_check
CHECK (
  subtotal >= 0
  AND tax_amount >= 0
  AND total_amount >= 0
);

-- ---------------------------------------------------------
-- Purchase order items
-- ---------------------------------------------------------

ALTER TABLE purchasing.purchase_order_items
ADD CONSTRAINT purchase_order_items_line_number_check
CHECK (
  line_number > 0
);

ALTER TABLE purchasing.purchase_order_items
ADD CONSTRAINT purchase_order_items_quantity_positive_check
CHECK (
  quantity > 0
);

ALTER TABLE purchasing.purchase_order_items
ADD CONSTRAINT purchase_order_items_received_quantity_check
CHECK (
  received_quantity >= 0
  AND received_quantity <= quantity
);

ALTER TABLE purchasing.purchase_order_items
ADD CONSTRAINT purchase_order_items_unit_cost_check
CHECK (
  unit_cost >= 0
);

ALTER TABLE purchasing.purchase_order_items
ADD CONSTRAINT purchase_order_items_tax_rate_check
CHECK (
  tax_rate >= 0
  AND tax_rate <= 100
);

ALTER TABLE purchasing.purchase_order_items
ADD CONSTRAINT purchase_order_items_amounts_check
CHECK (
  line_subtotal >= 0
  AND line_tax >= 0
  AND line_total >= 0
);

-- ---------------------------------------------------------
-- Goods receipts
-- ---------------------------------------------------------

ALTER TABLE purchasing.goods_receipts
ADD CONSTRAINT goods_receipts_posted_at_check
CHECK (
  status <> 'POSTED'
  OR posted_at IS NOT NULL
);

CREATE UNIQUE INDEX
goods_receipts_org_idempotency_key_idx
ON purchasing.goods_receipts (
  organization_id,
  idempotency_key
)
WHERE
  idempotency_key IS NOT NULL;

-- ---------------------------------------------------------
-- Goods receipt items
-- ---------------------------------------------------------

ALTER TABLE purchasing.goods_receipt_items
ADD CONSTRAINT goods_receipt_items_line_number_check
CHECK (
  line_number > 0
);

ALTER TABLE purchasing.goods_receipt_items
ADD CONSTRAINT goods_receipt_items_quantity_positive_check
CHECK (
  quantity > 0
);

ALTER TABLE purchasing.goods_receipt_items
ADD CONSTRAINT goods_receipt_items_factor_positive_check
CHECK (
  factor_to_base > 0
);

ALTER TABLE purchasing.goods_receipt_items
ADD CONSTRAINT goods_receipt_items_base_quantity_positive_check
CHECK (
  base_quantity > 0
);

ALTER TABLE purchasing.goods_receipt_items
ADD CONSTRAINT goods_receipt_items_costs_nonnegative_check
CHECK (
  unit_cost >= 0
  AND base_unit_cost >= 0
  AND total_cost >= 0
);

-- ---------------------------------------------------------
-- RLS: purchase_orders
-- ---------------------------------------------------------

ALTER TABLE purchasing.purchase_orders
ENABLE ROW LEVEL SECURITY;

ALTER TABLE purchasing.purchase_orders
FORCE ROW LEVEL SECURITY;

CREATE POLICY purchase_orders_tenant_policy
ON purchasing.purchase_orders
FOR ALL
TO pid_migrator, pid_app, pid_worker
USING (
  organization_id =
    app.current_organization_id()
)
WITH CHECK (
  organization_id =
    app.current_organization_id()
);

-- ---------------------------------------------------------
-- RLS: purchase_order_items
-- ---------------------------------------------------------

ALTER TABLE purchasing.purchase_order_items
ENABLE ROW LEVEL SECURITY;

ALTER TABLE purchasing.purchase_order_items
FORCE ROW LEVEL SECURITY;

CREATE POLICY purchase_order_items_tenant_policy
ON purchasing.purchase_order_items
FOR ALL
TO pid_migrator, pid_app, pid_worker
USING (
  organization_id =
    app.current_organization_id()
)
WITH CHECK (
  organization_id =
    app.current_organization_id()
);

-- ---------------------------------------------------------
-- RLS: goods_receipts
-- ---------------------------------------------------------

ALTER TABLE purchasing.goods_receipts
ENABLE ROW LEVEL SECURITY;

ALTER TABLE purchasing.goods_receipts
FORCE ROW LEVEL SECURITY;

CREATE POLICY goods_receipts_tenant_policy
ON purchasing.goods_receipts
FOR ALL
TO pid_migrator, pid_app, pid_worker
USING (
  organization_id =
    app.current_organization_id()
)
WITH CHECK (
  organization_id =
    app.current_organization_id()
);

-- ---------------------------------------------------------
-- RLS: goods_receipt_items
-- ---------------------------------------------------------

ALTER TABLE purchasing.goods_receipt_items
ENABLE ROW LEVEL SECURITY;

ALTER TABLE purchasing.goods_receipt_items
FORCE ROW LEVEL SECURITY;

CREATE POLICY goods_receipt_items_tenant_policy
ON purchasing.goods_receipt_items
FOR ALL
TO pid_migrator, pid_app, pid_worker
USING (
  organization_id =
    app.current_organization_id()
)
WITH CHECK (
  organization_id =
    app.current_organization_id()
);


-- =========================================================
-- PID: PURCHASING DOCUMENTS SECURITY
-- =========================================================

REVOKE ALL
ON SCHEMA purchasing
FROM PUBLIC;

GRANT USAGE
ON SCHEMA purchasing
TO pid_app, pid_worker;

REVOKE ALL
ON TABLE
  purchasing.purchase_orders,
  purchasing.purchase_order_items,
  purchasing.goods_receipts,
  purchasing.goods_receipt_items
FROM PUBLIC;

GRANT SELECT, INSERT, UPDATE
ON TABLE
  purchasing.purchase_orders,
  purchasing.purchase_order_items,
  purchasing.goods_receipts,
  purchasing.goods_receipt_items
TO pid_app;

GRANT SELECT
ON TABLE
  purchasing.purchase_orders,
  purchasing.purchase_order_items,
  purchasing.goods_receipts,
  purchasing.goods_receipt_items
TO pid_worker;

REVOKE DELETE
ON TABLE
  purchasing.purchase_orders,
  purchasing.purchase_order_items,
  purchasing.goods_receipts,
  purchasing.goods_receipt_items
FROM pid_app, pid_worker;

-- ---------------------------------------------------------
-- Purchase orders
-- ---------------------------------------------------------

ALTER TABLE purchasing.purchase_orders
ADD CONSTRAINT purchase_orders_currency_code_check
CHECK (
  currency_code ~ '^[A-Z]{3}$'
);

ALTER TABLE purchasing.purchase_orders
ADD CONSTRAINT purchase_orders_expected_date_check
CHECK (
  expected_date IS NULL
  OR expected_date >= order_date
);

ALTER TABLE purchasing.purchase_orders
ADD CONSTRAINT purchase_orders_amounts_nonnegative_check
CHECK (
  subtotal >= 0
  AND tax_amount >= 0
  AND total_amount >= 0
);

-- ---------------------------------------------------------
-- Purchase order items
-- ---------------------------------------------------------

ALTER TABLE purchasing.purchase_order_items
ADD CONSTRAINT purchase_order_items_line_number_check
CHECK (
  line_number > 0
);

ALTER TABLE purchasing.purchase_order_items
ADD CONSTRAINT purchase_order_items_quantity_positive_check
CHECK (
  quantity > 0
);

ALTER TABLE purchasing.purchase_order_items
ADD CONSTRAINT purchase_order_items_received_quantity_check
CHECK (
  received_quantity >= 0
  AND received_quantity <= quantity
);

ALTER TABLE purchasing.purchase_order_items
ADD CONSTRAINT purchase_order_items_unit_cost_check
CHECK (
  unit_cost >= 0
);

ALTER TABLE purchasing.purchase_order_items
ADD CONSTRAINT purchase_order_items_tax_rate_check
CHECK (
  tax_rate >= 0
  AND tax_rate <= 100
);

ALTER TABLE purchasing.purchase_order_items
ADD CONSTRAINT purchase_order_items_amounts_check
CHECK (
  line_subtotal >= 0
  AND line_tax >= 0
  AND line_total >= 0
);

-- ---------------------------------------------------------
-- Goods receipts
-- ---------------------------------------------------------

ALTER TABLE purchasing.goods_receipts
ADD CONSTRAINT goods_receipts_posted_at_check
CHECK (
  status <> 'POSTED'
  OR posted_at IS NOT NULL
);

CREATE UNIQUE INDEX
goods_receipts_org_idempotency_key_idx
ON purchasing.goods_receipts (
  organization_id,
  idempotency_key
)
WHERE
  idempotency_key IS NOT NULL;

-- ---------------------------------------------------------
-- Goods receipt items
-- ---------------------------------------------------------

ALTER TABLE purchasing.goods_receipt_items
ADD CONSTRAINT goods_receipt_items_line_number_check
CHECK (
  line_number > 0
);

ALTER TABLE purchasing.goods_receipt_items
ADD CONSTRAINT goods_receipt_items_quantity_positive_check
CHECK (
  quantity > 0
);

ALTER TABLE purchasing.goods_receipt_items
ADD CONSTRAINT goods_receipt_items_factor_positive_check
CHECK (
  factor_to_base > 0
);

ALTER TABLE purchasing.goods_receipt_items
ADD CONSTRAINT goods_receipt_items_base_quantity_positive_check
CHECK (
  base_quantity > 0
);

ALTER TABLE purchasing.goods_receipt_items
ADD CONSTRAINT goods_receipt_items_costs_nonnegative_check
CHECK (
  unit_cost >= 0
  AND base_unit_cost >= 0
  AND total_cost >= 0
);

-- ---------------------------------------------------------
-- RLS: purchase_orders
-- ---------------------------------------------------------

ALTER TABLE purchasing.purchase_orders
ENABLE ROW LEVEL SECURITY;

ALTER TABLE purchasing.purchase_orders
FORCE ROW LEVEL SECURITY;

CREATE POLICY purchase_orders_tenant_policy
ON purchasing.purchase_orders
FOR ALL
TO pid_migrator, pid_app, pid_worker
USING (
  organization_id =
    app.current_organization_id()
)
WITH CHECK (
  organization_id =
    app.current_organization_id()
);

-- ---------------------------------------------------------
-- RLS: purchase_order_items
-- ---------------------------------------------------------

ALTER TABLE purchasing.purchase_order_items
ENABLE ROW LEVEL SECURITY;

ALTER TABLE purchasing.purchase_order_items
FORCE ROW LEVEL SECURITY;

CREATE POLICY purchase_order_items_tenant_policy
ON purchasing.purchase_order_items
FOR ALL
TO pid_migrator, pid_app, pid_worker
USING (
  organization_id =
    app.current_organization_id()
)
WITH CHECK (
  organization_id =
    app.current_organization_id()
);

-- ---------------------------------------------------------
-- RLS: goods_receipts
-- ---------------------------------------------------------

ALTER TABLE purchasing.goods_receipts
ENABLE ROW LEVEL SECURITY;

ALTER TABLE purchasing.goods_receipts
FORCE ROW LEVEL SECURITY;

CREATE POLICY goods_receipts_tenant_policy
ON purchasing.goods_receipts
FOR ALL
TO pid_migrator, pid_app, pid_worker
USING (
  organization_id =
    app.current_organization_id()
)
WITH CHECK (
  organization_id =
    app.current_organization_id()
);

-- ---------------------------------------------------------
-- RLS: goods_receipt_items
-- ---------------------------------------------------------

ALTER TABLE purchasing.goods_receipt_items
ENABLE ROW LEVEL SECURITY;

ALTER TABLE purchasing.goods_receipt_items
FORCE ROW LEVEL SECURITY;

CREATE POLICY goods_receipt_items_tenant_policy
ON purchasing.goods_receipt_items
FOR ALL
TO pid_migrator, pid_app, pid_worker
USING (
  organization_id =
    app.current_organization_id()
)
WITH CHECK (
  organization_id =
    app.current_organization_id()
);
