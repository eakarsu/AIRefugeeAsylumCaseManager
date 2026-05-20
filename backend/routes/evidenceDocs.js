const buildCrud = require('./_crudFactory');

module.exports = buildCrud({
  table: 'evidence_docs',
  fields: ['doc_id','case_id','type','source','uploaded_at','status','notes'],
});
