// {
//     "lkjasd": {

//     },
//     "": {

//     }
// }

window.xhr = src => {
    log('xhr', src)
    return (x => {
        x.withCredentials = false
        x.open('GET', src, false)
        x.send()
        return x.responseText
    })(new XMLHttpRequest())
}
window.dependency = src => document.head.append((x => Object.assign(x, { innerHTML:xhr(src) }))(document.createElement('script')))
;[
    '/lib/2/common.js',
].map(x => dependency(new URL(x, 'https://uh.software').toString()))

const menu = mutable_static_methods({
    of: (o={}) => Object.assign(o, entries(menu).map(([k, v]) => o[k] = (...x) => v(o, ...x))),
    new: (o={
        name: '',
        cover: undefined,
        section: [],
        items: [],
        style: `
        
        `,
    }) => menu.of(o),

    add: (o, item={
        section: "",
        name: "",
        description: "",
        price: "",
        allergens: "",
    }) => o.items.add(item),

    remove: (o, item) => lists.remove(o, item),
})
