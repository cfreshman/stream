import path from 'node:path'
import fs from 'fs'
import crypto from 'crypto'
import { fileURLToPath } from 'url'


export const prod = process.env.NODE_ENV === 'production'
export const dev = !prod

export const pass = x=>x
export const truthy = x=>!!x
export const exists = x => x !== undefined
export const defer = (f=()=>{}, ms=0) => new Promise(r => setTimeout(_=> r(f && f()), ms))
export const set = (data, sep=' ') => new Set(typeof data === 'string' ? str?.split(sep) : data)
export const list = (data, sep=' ') => typeof data === 'string' ? data.split(sep) : new Array(data)
export function range(n_or_start, end=undefined, step=1) {
    if (end === undefined) {
        end = n_or_start
        n_or_start = 0
    }
    return Array.from({ length: Math.floor((end - n_or_start) / step) }).map((_, i) => n_or_start + i*step)
}
export function group(array, n) {
    let i = 0
    let groups = []
    while (i < array.length) {
        groups.push(array.slice(i, i+n))
        i += n
    }
    return groups
}
export const merge = (...os) => {
    const result = {}
    os.map(o => {
        Object.keys(o).map(k => {
            if (o[k] === undefined) delete result[k]
            else result[k] = (typeof(result[k]) === 'object' && typeof(o[k]) === 'object' && !Array.isArray(o[k])) ? merge(result[k], o[k]) : o[k]
        })
    })
    return result
}
export const transmute = (o, f) => {
    return Object.assign({}, ...Object.keys(o).map(k => (typeof(o[k]) === 'object' && !Array.isArray(o[k])) ? { [k]: transmute(o[k], f) } : f(k, o[k])))
}
export const deletion = (o={}) => transmute(o, (k,v)=> v ? { [k]: undefined } : {})

// rand & hashing
const _alphanum = 'qwertyuiopasdfghjklzxcvbnm1234567890QWERTYUIOPASDFGHJKLZXCVBNM'
export const rand = {
    i: (n) => Math.floor(Math.random() * n),
    sample: (a) => a[rand.i(a.length)],
    alphanum: (n) => range(n).map(() => rand.sample(_alphanum)).join(''),
    hex: (n) => rand.i(Math.pow(16, n)).toString(16),
}
export const hash = str => crypto.createHmac('sha256', 'stream').update(str).digest('hex')

// server dates
export const datetime = (date=new Date()) => date.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    dateStyle: 'short',
    timeStyle: 'medium',
    hour12: false,
}).replace(',', '')
export const servertime = (date=new Date()) => [Number(date), datetime(date)].join(' ')
export const requestkey = (rq) => rq.ip + ' ' + rq.method + ' ' + rq.originalUrl

// object parsing
export function pick(obj, spaceDelimitedProps) {
    if (Array.isArray(obj)) return obj.map(x => pick(x, spaceDelimitedProps))
    if (typeof(obj) === 'string') return x => pick(x, obj)
    return spaceDelimitedProps.split(' ').reduce((a, v) => {
        if (Object.hasOwn(obj, v)) a[v] = obj[v]
        return a
    }, {})
}
export function unpick(obj, spaceDelimitedProps) {
    if (Array.isArray(obj)) return obj.map(x => unpick(x, spaceDelimitedProps))
    const unpicked = { ...obj }
    spaceDelimitedProps.split(' ').map(prop => delete unpicked[prop])
    return unpicked
}

// file system
export const basedir = () => path.dirname(fileURLToPath(import.meta.url))
export const file = {
    path: path.join(basedir(), dev ? '../public' : '../build'),
    index: undefined,

    exists: (relative) => fs.existsSync(path.join(file.path, relative)),
    file: (relative) => file.exists(relative) && fs.readFileSync(path.join(file.path, relative)).toString() || '',
    dir: (relative) => file.exists(relative) && fs.readdirSync(path.join(file.path,  relative)) || [],
}
Object.assign(file, {
    index: file.file('index.html'),
})

// requests/responses
export function HttpError(status, message) {
    const error = new Error(message)
    error.status = status
    return error
}
const _handle = (er, rs) => {
    const t = new Date().toISOString().replace(/[^-]+-(.+):[^:]+$/, '$1').replace('T', ' ')
    console.error('[ERROR]', t, er)
    if (!er.status) er = HttpError(500, er.message ?? er)
    rs.status(er.status).json({ error: er.message })
}
export function returnJson(func) {
    return (req, res) => {
        try {
            func(req, res)
                .then(pass)
                .then(data => {
                    // console.log(data)
                    try {
                        const query = Object.fromEntries(new URLSearchParams(req.query))
                        if (query.resolve) req.resolve = query.resolve.split(',')
                        if (req.resolve?.length) {
                            const queried = {}
                            while (req.resolve?.length) {
                                const query = req.resolve.shift()
                                let from = data
                                const parts = query.split('.')
                                while (parts.length) from = from[parts.shift()]
                                queried[query] = from
                            }
                            data = queried
                        }
                    } catch {} // bad query, return entire object
                    res.json(data)
                })
                .catch(e => _handle(e, res))
        } catch (e) {
            _handle(e, res)
        }
    }
}
export const jr = returnJson

export function returnError(error, res=undefined) {
    if (res) {
        try {
            throw error
        } catch (e) {
            _handle(e, res)
        }
    } else {
        return (req, res) => {
            try {
                throw error
            } catch (e) {
                _handle(e, res)
            }
        }
    }
}
export const er = returnError

export function parseParam(rq, param) {
    if (param.includes(' ')) {
        param = param.split(' ')
        let result
        while (result === undefined && param.length) {
            result = result ?? parseParam(rq, param.shift())
        }
        return result
    } else {
        return (
            Object.hasOwn(rq.params, param) 
            ? rq.params[param] 
            : Object.hasOwn(rq.query, param) 
            ? rq.query[param]
            : Object.hasOwn(rq.body, param)
            ? rq.body[param]
            : undefined
        )
    }
}
export const rp = parseParam

export function parseParamObject(rq, params=undefined) {
    const param_list = params === undefined ? [rq.params, rq.query, rq.body].map(x=>Object.keys(x||{})).flatMap(pass) : list(params)
    return Object.fromEntries(param_list.map(x => [x, parseParam(rq, x)]))
}
export const op = parseParamObject
