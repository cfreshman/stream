import path from 'path';
import fs from 'fs'
import * as http from 'http'
import { createRequire } from 'module'
import process from 'process'
import cors from 'cors'
import express from 'express'
import { domains, replace } from './projects'
import { default as routes } from './routes'
import { datetime, er, file, list, pick, prod, rand, requestkey, servertime, set } from './util'


console.debug('env', pick(process.env, 'NODE_ENV STREAM_SERVER_PORT STREAM_SUBDOMAIN'))
list('uncaughtException unhandledRejection')
.map(x => process.on(x, e => console.error(x, e)))

const app = express()
const server = http.createServer(app)
const port = 5723 // STREam
list('uncaughtException exit SIGINT SIGUSR1 SIGUSR2 SIGTERM')
.map(evt => process.on(evt, ()=>{
    if (server.listening) {
        server.close()
        console.log('\ngoodbye')
        process.exit(0)
    }
}))

const template = {
    regex: {
        alts: {
            icon: ['apple_icon', 'og.image', 'twitter.image'],
            title: ['og.title', 'twitter.title'],
            description: ['og.description', 'twitter.description'],
            url: ['twitter.url', 'twitter.site'],
            twitter_url: ['twitter.url', 'twitter.site'],
        },
        index: {
            title: /<title>([^<]*)<\/title>/,
            icon: /<link rel="icon" href=("([^"]*)")>/,
            apple_icon: /<link rel="apple-touch-icon-precomposed" href=("([^"]*)")>/,
            description: /<meta name="description" content=("([^"]*)")>/,
            keywords: /<meta name="keywords" content=("([^"]*)")>/,
            manifest: /<link rel="manifest" href=("([^"]*)")>/,
            og: {
                image: /<meta property="og:image" content=("([^"]*)")>/,
                title: /<meta property="og:title" content=("([^"]*)")>/,
                description: /<meta property="og:description" content=("([^"]*)")>/,
            },
            twitter: {
                card: /<meta name="twitter:card" content=("([^"]*)")>/,
                url: /<meta name="twitter:url" content=("([^"]*)")>/,
                site: /<meta name="twitter:site" content=("([^"]*)")>/,
                creator: /<meta name="twitter:creator" content=("([^"]*)")>/,
                title: /<meta name="twitter:title" content=("([^"]*)")>/,
                image: /<meta name="twitter:image" content=("([^"]*)")>/,
                description: /<meta name="twitter:description" content=("([^"]*)")>/,
            },
        },
    },
    defaults: {
        index: {},
    },
    templates: {
        index: {},
    },
    recurse: (regexes, found, assign, raw=file.index) => {
        Object.keys(regexes).forEach(key => {
            const regex = regexes[key]
            if (regex.test) {
                const match = raw?.match(regex) || []
                const value = found[key] = match[0]
                if (value) {
                    // match[1] either ("<match>") or ("") or (<match>) or ()
                    // match[2] either (<match>) or () or undefined
                    // if match[2] truthy or undefined, replace (match[2] || match[1]) with replacement
                    // else, replace match[1] with centered replacement
                    const center = Math.floor(match[1].length / 2)
                    assign[key] = replacement => match[2] !== ''
                    ? value.replace(match[2] || match[1], replacement)
                    : value.replace(
                        match[1],
                        match[1].slice(0, center) + replacement + match[1].slice(center))
                }
            } else {
                const value = found[key] = {}
                assign[key] = {}
                template.recurse(regex, value, assign[key], raw)
            }
        })
    },
    replace: (str, replace, regexes=template.regex.index, defaults=template.defaults.index, templates=template.templates.index) => {
        Object.entries(template.regex.alts).map(([k, v]) => {
            if (replace[k]) {
                v.map(x => {
                    let a = replace, b = regexes, c = defaults, d = templates
                    const keys = x.split('.')
                    while (keys.length) {
                        a = a && a[keys[0]]
                        b = b && b[keys[0]]
                        c = c && c[keys[0]]
                        d = d && d[keys[0]]
                        keys.shift()
                    }
                    if (!a && b?.test && c && d) {
                        str = str.replace(c, d(replace[k]))
                    }
                })
            }
        })
        Object.keys(replace).map(k => {
            const regex = regexes[k]
            if (!(defaults[k] && templates[k] && replace[k])) {
                // pass
            } else if (regex?.test) {
                str = str.replace(defaults[k], templates[k](replace[k]))
            } else if (regex) {
                str = template.replace(str, Object.assign({}, replace, replace[k], { [k]: false }), regex, defaults[k], templates[k])
            }
        })
        return str
    },
}
template.recurse(template.regex.index, template.defaults.index, template.templates.index)

declare global {
    namespace Express {
        export interface Request {
           start: number
           id: string
           log: (...x:any[])=>void
           domain_app: string
           origin: string
        }
    }
}
function configure(...x) {

    // start server timing
    app.use((rq, rs, nx) => {
        rq.start = performance.now()
        rq.id = rand.alphanum(4)
        rq.log = (...x) => console.log(rq.id, ...x)
        nx()
    })

    // reject > 50 repeated requests
    let last = '', repeats = 0
    app.use((rq, rs, nx) => {
        const query = requestkey(rq)
        if (last === query) repeats += 1    
        else {
            repeats = 0
            last = query
        }
        repeats > 50 ? er('repeated request') : nx()
    })

    // request cors / parsing
    app.use(cors())
    app.set('trust proxy', true)
    Object.entries({
        json: {},
        urlencoded: {},
        text: {},
        raw: { type: '*/*' },
    }).map(([parse, rules]) => express[parse]({
        extended: true,
        limit: '50mb',
        ...rules,
    }))

    // host => app
    app.get('/*', async (rq, rs, nx) => {
        Object.entries(domains).some(([name, domain]) => {
            if (rq.url.match(new RegExp(`^/${name}/.+`, 'i'))) {
                rq.domain_app = name
                rq.url = rq.url.replace(new RegExp(`${name}/?`, 'i'), '')
                rq.origin = domain
                nx()
                return true
            }
        }) || nx()
    })

    // TODO backoff for logged requests
    // probability based on time since last log?
    const silence = set([
        'GET /apple-touch-icon-precomposed.png',
        'GET /favicon.ico',
        'GET /apple-touch-icon.png',
    ])
    app.use((rq, rs, nx) => {
        if (!silence.has(rq.method + ' ' + rq.originalUrl)) {
            rq.log(servertime(), rq.method, rq.originalUrl)
        }
        nx()
    })

    // api routes
    app.get('(/api|)/ping', (rq, rs) => rs.send('pong'))
    Object
    .entries(routes)
    .map(([path, index]) => app.use('/api/'+path, index.routes))

    // stream meta responses
    let streamDefaults, streamTemplates, streamIndex
    app.get(['/-?stream', '/-?raw/stream'], async (req, res) => {
        let html = streamIndex = streamIndex || fs.readFileSync(path.join(file.path, 'raw/stream/index.html')).toString()
        const [_, search] = /\?(.+)/.exec(req.url) || ['', '']
        const query = new URLSearchParams(search)
        let item = query.get('')?.split('?')[0]
        if (!item) {
            // const dir = fs.readdirSync(path.join(staticPath, 'raw/stream/items'))
            // item = dir[0]
        }
        console.debug('STREAM', req.url, item)
        if (item) {
            if (!streamDefaults) {
                streamDefaults = {}
                streamTemplates = {}
                template.recurse(template.regex.index, streamDefaults, streamTemplates, html)
                console.debug(streamDefaults, streamTemplates)
            }
            let item_href = `/raw/stream/items/${item}`
            let item_html = fs.readFileSync(path.join(file.path,  item_href)).toString()
            const redirect_match = /<script>location.href='(?<href>.+)'<\/script>/.exec(item_html)
            console.debug(redirect_match)
            if (redirect_match?.groups) {
                console.debug(path.join(file.path, redirect_match?.groups?.href))
                item_href = redirect_match.groups.href
                item_html = fs.readFileSync(path.join(file.path, item_href, 'index.html')).toString()
            }

            const title_match = /<title>(?<value>[^<]*)<\/title>/.exec(item_html) as any
            const description_match = /<meta name=description content="(?<value>[^"]*)"/.exec(item_html) as any
            // console.debug({title_match,description_match})
            let title
            if (title_match && description_match) title = `(${title_match.groups.value}) ${description_match.groups.value}`
            else if (title_match || description_match) title = (title_match || description_match).groups.value
            else {
                const body_match = /<body(?:[^>]*)>(?<value>[^<]*)<\/body>/.exec(item_html) as any
                if (body_match) title = body_match.groups.value
                else {
                    let url
                    try{ url = new URL(item) }catch{}
                    title = url?.search.slice(2) || item
                }
            }

            const img_match = /<img src=(?<value>([^ ]+)|(['"][^'"]['"])) /.exec(item_html)
            // console.debug({...img_match?.groups}, item_html)
            const icon = `https://freshman.dev${item_href}/${img_match?.groups?.value.replace(/"/g, '') || ''}`
            const replacements = { title, icon, og: {title,icon}, twitter: {
                card: 'summary_large_image',
            } }
            console.debug('STREAM ITEM', item, replacements)
            ;[
                [template.regex.index.title, replacements.title],
                [template.regex.index.icon, replacements.icon],
                [template.regex.index.og.title, replacements.og.title],
                [template.regex.index.og.image, replacements.og.icon],
                [template.regex.index.twitter.card, replacements.twitter.card],
            ].forEach(([regex, replacement]) => {
                const match = html.match(regex)
                const value = match[0]
                if (value) {
                    // match[1] either ("<match>") or ("") or (<match>) or ()
                    // match[2] either (<match>) or () or undefined
                    // if match[2] truthy or undefined, replace (match[2] || match[1]) with replacement
                    // else, replace match[1] with centered replacement
                    const center = Math.floor(match[1].length / 2)
                    const actual = match[2] !== ''
                    ? value.replace(match[2] || match[1], replacement)
                    : value.replace(
                        match[1],
                        match[1].slice(0, center) + replacement + match[1].slice(center))
                    html = html.replace(regex, actual)
                }
            })
            // html = template.recurse(html, replacements, template.regex.index, streamDefaults, streamTemplates)
        }
        res.send(html)
    })

    // production build
    //
    // pre-gzipped files
    app.use((rq, rs, nx) => {
        if (rq.headers['accept-encoding']?.includes('gzip')) {
            if (file.exists(rq.url + '.gz')) rq.url += '.gz'
            else if (file.exists(rq.url + 'index.html.gz')) rq.url += 'index.html.gz'
            rq.url.endsWith('gz') && rs.set('Content-Encoding', 'gzip')
        }
        nx()
    })
    app.use(express.static(file.path))
    //
    // fill meta info for preview (e.g. text messages)
    app.get('/*', function (rq, rs, nx) {
        if (rq.url.match('^/api$')) return nx()

        console.debug(rq.path, file.path, file.exists(rq.path))

        const page = decodeURIComponent((rq.domain_app || '') + rq.url).replace(/^\/-\/?/, '/').replace(/\/$/, '')
        const replacements = {
            title: {
                // '/path': 'host.example/path',
            }[rq.url] || page,
            url: rq.origin + rq.url,
            ...(replace[page] || {}),
        }

        let html = file.index
        if (replacements) html = template.replace(html, replacements)
        rs.send(html)
    })

    // log errors
    app.use((err, rq, rs, nx) => {
        const now = new Date()
        console.error(Number(now), datetime(now), err)
        nx(err)
    })

    // run production scripts
    if (prod) {
        const scripts = Object.fromEntries(list('start once').map(x => [x, `server/scripts/${x}.js`]).map(([x, path]) => [x, fs.existsSync(path) && fs.readFileSync(path).toString()]))
        console.debug({ scripts })
        Object.entries(scripts).map(([name, file]) => file && createRequire(import.meta.url)(`./scripts/${name}`))
        if (scripts.once) {
            fs.writeFileSync('server/scripts/used/once.js', scripts.once)
            fs.writeFileSync('server/scripts/once.js', '')
        }
    }

    console.debug('defined', app._router.stack.length, 'routes')
}

server.on('listening', () => console.debug('listening at', server.address(), file.path))
server.on('listening', configure)
server.listen(port, '::')
