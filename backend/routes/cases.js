const buildCrud = require('./_crudFactory');

module.exports = buildCrud({
  table: 'cases',
  fields: ['case_id','client_id','type','lead_attorney','opened_at','status','notes'],
});
