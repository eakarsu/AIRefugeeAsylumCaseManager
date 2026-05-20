const buildCrud = require('./_crudFactory');

module.exports = buildCrud({
  table: 'court_calendars',
  fields: ['calendar_id','court','date','case_count','status','judge','notes'],
});
