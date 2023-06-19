import express from 'express'
import { hash } from '../../util'

const R = express.Router()

R.get('/ip', async (rq, rs) => rs.send(rq.ip))
R.get('/id', async (rq, rs) => rs.send(hash(rq.ip)))

export default {
  routes: R,
}
