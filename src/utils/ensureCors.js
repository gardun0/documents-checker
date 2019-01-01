import corsify from 'corsify'

const ensureCors = corsify({
  'Access-Control-Allow-Methods': 'POST, GET, PATCH, PUT',
  'Access-Control-Request-Headers': 'Content-Type',
  'Access-Control-Allow-Origin': '*'
})

export default (request, response) => ensureCors(request, response)
