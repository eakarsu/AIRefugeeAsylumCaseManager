const buildCrud = require('./_crudFactory');

module.exports = buildCrud({
  table: 'immigration_forms',
  fields: ['form_id','case_id','form_type','version','filed_at','status','notes'],
});
