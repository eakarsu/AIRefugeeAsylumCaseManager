const buildCrud = require('./_crudFactory');

module.exports = buildCrud({
  table: 'dossiers',
  fields: ['dossier_id','case_id','version','doc_count','last_updated','status','notes'],
});
