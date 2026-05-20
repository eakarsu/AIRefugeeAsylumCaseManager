const buildCrud = require('./_crudFactory');

module.exports = buildCrud({
  table: 'interpreters',
  fields: ['interpreter_id','name','languages','certifications','base','status','notes'],
});
