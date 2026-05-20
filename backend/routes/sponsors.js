const buildCrud = require('./_crudFactory');

module.exports = buildCrud({
  table: 'sponsors',
  fields: ['sponsor_id','client_id','name','location','sponsor_status','status','notes'],
});
