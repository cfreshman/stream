export const projects = Object.fromEntries(Object.entries({
  stream: 'media',
})
.sort()
.sort((a, b) => (/^[a-zA-Z]/.test(a[0]) ? 0 : 1) - (/^[a-zA-Z]/.test(b[0]) ? 0 : 1))
.map(([k, v]) => [k, typeof v === 'string' ? { description: v } : v]))

export const domains = {
}

const _common = {
}
export const replace = {
  ...Object.fromEntries(Object.entries(projects).map(([k, v]) => [k, { title:k, ...v }])),
  ..._common,
}
