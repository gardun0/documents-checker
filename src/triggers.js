import { sync as glob } from 'glob'
import { resolve } from 'path'
import { compose, split, filter, map, head, tail } from 'ramda'

const pattern = './triggers/**/function.*.js'
const filePattern = new RegExp(/(?:function\.)(.*?)(?:\.js)/)

const triggers = glob(pattern, { ignore: `!${pattern}` })

const getName = compose(
  head,
  map(compose(tail, str => filePattern.exec(str))),
  filter(str => filePattern.test(str)),
  split('/')
)

const triggersToExport = triggers
  .map(path => ({ path, name: getName(path) }))
  .reduce((accum, {path, name}) => ({
    ...accum,
    [name]: require(resolve(__dirname, path))
  }), {})

export default triggersToExport
