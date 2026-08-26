// Aggregations for /reports/* — computed in SQL, not by loading tables into
// memory. Shapes mirror the legacy ReportsService exactly.

module.exports = {
  async salesSummary(db, { companyId } = {}) {
    const result = await db.query(
      `SELECT COALESCE(SUM(total), 0)::float AS total_sales,
              COUNT(*)::int AS order_count
       FROM orders${companyId ? ' WHERE company_id = $1' : ''}`,
      companyId ? [companyId] : [],
    );
    const { total_sales: totalSales, order_count: orderCount } = result.rows[0];
    return {
      totalSales,
      orderCount,
      avgOrderValue: orderCount > 0 ? Number((totalSales / orderCount).toFixed(2)) : 0,
      period: 'All Time',
    };
  },

  async inventoryStatus(db, { companyId } = {}) {
    const result = await db.query(
      `SELECT COUNT(*)::int AS total_skus,
              COUNT(*) FILTER (WHERE stock > 0 AND stock <= reorder_level * 0.5)::int AS critical_count,
              COUNT(*) FILTER (WHERE stock > 0 AND stock <= reorder_level AND stock > reorder_level * 0.5)::int AS low_stock_count,
              COUNT(*) FILTER (WHERE stock <= 0)::int AS out_of_stock_count
       FROM inventory${companyId ? ' WHERE company_id = $1' : ''}`,
      companyId ? [companyId] : [],
    );
    const row = result.rows[0];
    const lowStockCount = row.low_stock_count + row.critical_count;
    const outOfStockCount = row.out_of_stock_count;
    return {
      totalSKUs: row.total_skus,
      lowStockCount,
      outOfStockCount,
      inventoryHealth: lowStockCount + outOfStockCount > 5 ? 'Attention Required' : 'Healthy',
    };
  },

  async returnsSummary(db, { companyId } = {}) {
    const result = await db.query(
      `SELECT COUNT(*)::int AS total_returns,
              COUNT(*) FILTER (WHERE status = 'Pending')::int AS pending_returns,
              COALESCE(SUM(amount) FILTER (WHERE status IN ('Refunded', 'Approved')), 0)::float AS total_refunded
       FROM returns${companyId ? ' WHERE company_id = $1' : ''}`,
      companyId ? [companyId] : [],
    );
    const row = result.rows[0];
    return {
      totalReturns: row.total_returns,
      pendingReturns: row.pending_returns,
      totalRefunded: row.total_refunded,
    };
  },

  /** Best-selling products over a trailing window. Cancelled orders excluded. */
  async topProducts(db, { companyId, days = 30, limit = 10 } = {}) {
    const values = [Math.max(1, Math.trunc(days) || 30)];
    let companyClause = '';
    if (companyId) {
      values.push(companyId);
      companyClause = ` AND o.company_id = $${values.length}`;
    }
    values.push(Math.min(Math.max(1, Math.trunc(limit) || 10), 100));
    const result = await db.query(
      `SELECT oi.product_id AS product_id,
              MAX(oi.product_name) AS product_name,
              SUM(oi.quantity)::int AS units_sold,
              ROUND(SUM(oi.quantity * oi.item_price), 2)::float AS revenue
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
        WHERE o.status <> 'Cancelled'
          AND o.order_date >= now() - make_interval(days => $1)${companyClause}
        GROUP BY oi.product_id
        ORDER BY units_sold DESC
        LIMIT $${values.length}`,
      values,
    );
    return result.rows.map((row) => ({
      productId: row.product_id,
      name: row.product_name,
      unitsSold: row.units_sold,
      revenue: row.revenue,
    }));
  },
};
