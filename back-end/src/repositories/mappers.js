/**
 * Builds a parameterized SET clause from a camelCase → snake_case field map.
 * Only keys present in `fields` are written, so PATCH-style updates never
 * clobber unspecified columns.
 *
 *   mapRow({ adminName: 'A', profit: 5 }, FIELD_MAP)
 *   → { setClause: 'admin_name = $1, profit = $2', values: ['A', 5] }
 */
function mapRow(fields, fieldMap) {
  const setParts = [];
  const values = [];
  for (const [key, value] of Object.entries(fields)) {
    const column = fieldMap ? fieldMap[key] : key;
    if (!column) continue;
    values.push(value);
    setParts.push(`${column} = $${values.length}`);
  }
  return { setClause: setParts.join(', '), values };
}

module.exports = { mapRow };
