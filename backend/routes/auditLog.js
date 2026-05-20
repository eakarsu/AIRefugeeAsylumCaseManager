const buildCrud = require('./_crudFactory');

module.exports = buildCrud({
  table: 'audit_log',
  fields: ['entry_id','actor','target','action','result','ts','notes'],
});
