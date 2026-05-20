const buildCrud = require('./_crudFactory');

module.exports = buildCrud({
  table: 'clients',
  fields: ['client_id','full_name','country_of_origin','dob','intake_date','status','notes'],
});
