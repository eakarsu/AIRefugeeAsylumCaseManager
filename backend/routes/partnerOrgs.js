const buildCrud = require('./_crudFactory');

module.exports = buildCrud({
  table: 'partner_orgs',
  fields: ['org_id','name','country','services','contact','status','notes'],
});
