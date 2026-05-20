const buildCrud = require('./_crudFactory');

module.exports = buildCrud({
  table: 'deportation_orders',
  fields: ['order_id','case_id','issued_at','removal_country','status','appeal_status','notes'],
});
