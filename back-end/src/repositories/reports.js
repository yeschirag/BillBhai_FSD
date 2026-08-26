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
};
