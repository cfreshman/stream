import express from 'express'
import { file, op } from '../../util'

const R = express.Router()

R.get('/:name?', async (rq, rs) => {
  const { name='' } = op(rq)
  rs.json(name.includes('archive') ? [] : file.dir(`raw/stream/${name.replaceAll('../', '')}/items`).reverse().map(x => encodeURI(x)))
})

export default {
  routes: R,
}
