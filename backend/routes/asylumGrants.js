const buildCrud = require('./_crudFactory');

module.exports = buildCrud({
  table: 'asylum_grants',
  fields: ['grant_id','case_id','status','granted_at','court','basis','notes'],
});
