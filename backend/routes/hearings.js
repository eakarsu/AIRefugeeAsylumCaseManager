const buildCrud = require('./_crudFactory');

module.exports = buildCrud({
  table: 'hearings',
  fields: ['hearing_id','case_id','court','date','judge','status','notes'],
});
