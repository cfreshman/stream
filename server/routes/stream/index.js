import express from 'express'
import { file, op } from '../../util'

const R = express.Router()

const _file_name = /[^.]+\.[^.]+$/
R.get('/:name?', async (rq, rs) => {
  const { name='' } = op(rq)
  const dir = name.includes('archive') ? [] : file.dir(`raw/stream/${name.replaceAll('../', '')}/items`, { recursive:true }).reverse()
  rs.json(dir.filter(x => _file_name.test(x)).map(x => encodeURI(x)))
})

export default {
  routes: R,
}
