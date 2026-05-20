const buildCrud = require('./_crudFactory');

module.exports = buildCrud({
  table: 'paralegals',
  fields: ['paralegal_id','name','attorney_id','base','case_count','status','notes'],
});
