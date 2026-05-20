const buildCrud = require('./_crudFactory');

module.exports = buildCrud({
  table: 'family_members',
  fields: ['member_id','client_id','name','relationship','location','status','notes'],
});
