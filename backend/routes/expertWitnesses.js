const buildCrud = require('./_crudFactory');

module.exports = buildCrud({
  table: 'expert_witnesses',
  fields: ['witness_id','name','expertise','case_id','fee_usd','status','notes'],
});
