const buildCrud = require('./_crudFactory');

module.exports = buildCrud({
  table: 'attorneys',
  fields: ['attorney_id','name','bar_state','specialty','case_count','status','notes'],
});
