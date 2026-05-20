const buildCrud = require('./_crudFactory');

module.exports = buildCrud({
  table: 'country_of_origin_info',
  fields: ['coi_id','country','period','source','retrieved_at','citation_count','notes'],
});
