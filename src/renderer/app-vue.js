//

// import {log} from './utils'
import {q, qs, empty, create, span} from './utils'
import {ipcRenderer, shell} from 'electron'
import { EventBus } from './bus'
import router from './router'
import { unihan } from './components/unihan.js'

import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'

let zh = require('speckled-band')
const rpng = 'static/right.png'
const lpng = 'static/left.png'
const clipboard = require('electron-clipboard-extended')
var Mousetrap = require('mousetrap')
let segmenter = require('recursive-segmenter')

export default {
  name: 'morpheus',
  created () {
    ipcRenderer.send('cfg')
    clipboard
      .on('text-changed', () => {
        let text = clipboard.readText().trim()
        let pars = zh(text)
        if (!pars) return
        router.push({path: 'main', query: {text: text}})
      })
      .startWatching()

    let that = this
    ipcRenderer.on('section', function (event, name) {
      that.showSection(name)
    })
    Mousetrap.bind('esc', function () { EventBus.$emit('clean') }, 'keyup')
    Mousetrap.bind('alt+left', function () { router.go(-1) }, 'keyup')
    Mousetrap.bind('alt+right', function () { router.go(1) }, 'keyup')
    Mousetrap.bind('ctrl+shift+u', () => { showUnihan('u') })
    Mousetrap.bind('ctrl+shift+c', () => { showUnihan('c') })
    Mousetrap.bind('ctrl+shift+s', () => { showUnihan('s') })
    Mousetrap.bind('ctrl+shift+g', () => { showUnihan('g') })
    Mousetrap.bind('ctrl+shift+n', () => { showUnihan('n') })
    Mousetrap.bind('ctrl+shift+m', () => { showUnihan('m')})
  },

  mounted () {
    this.$electron.ipcRenderer.on('cfg', (event, cfg) => {
      let sorted = _.sortBy(cfg, 'weight')
      EventBus.$emit('cfg', sorted)
    })
  },

  data: function () {
    return {
      rpng: rpng,
      lpng: lpng
    }
  },
  methods: {
    externaLink (ev) {
      if (!ev.target.classList.contains('external')) return
      let href = ev.target.getAttribute('href')
      shell.openExternal(href)
    },
    goBack () {
      EventBus.$emit('clean')
      router.go(-1)
    },
    goForward () {
      EventBus.$emit('clean')
      router.go(1)
    },
    showSection (name) {
      router.push({path: name, query: {text: name}})
    }
  }
}

ipcRenderer.on('before-quit', function (event) {
  clipboard.off('text-changed')
  // clipboard.stopWatching()
})

ipcRenderer.on('hanzi', function (event, doc) {
  EventBus.$emit('show-hanzi', doc)
})

// ipcRenderer.on('cfg', function (event, cfg) {
//   EventBus.$emit('cfg', cfg)
// })

// string of the segments - spans
ipcRenderer.on('data', function (event, data) {
  let parsel = JSON.stringify(data.parid)
  let par = document.querySelector(`[parid=${parsel}]`)
  if (!par) return
  let clsel = JSON.stringify(data.clid)
  let clause = par.querySelector(`[clid=${clsel}]`)
  if (!clause) return
  let docs = _.flatten(data.res.map(d => { return d.docs }))
  let dicts = _.uniq(_.flatten(data.res.map(d => { return d._id })))
  Promise.resolve(segmenter(data.str, dicts)).then(segs => {
    let key = clause.textContent
    if (!EventBus.res) EventBus.res = {}
    EventBus.res[key] = {docs: docs, segs: segs}
    setSegs(clause, segs)
  })
})

function setSegs (clause, segs) {
  empty(clause)
  segs.forEach(s => {
    let spn = span(s.seg)
    if (s.ambis) {
      spn.classList.add('ambi')
      spn.ambis = s.ambis
    } else if (s.hole) {
      spn.classList.add('hole')
    } else {
      spn.classList.add('seg')
    }
    clause.appendChild(spn)
  })
}

function showUnihan(sym) {
  let current = q('.seg:hover')
  if (!current) return
  let seg = current.textContent
  if (seg.length !== 1) return
  unihan(sym, seg)
}
