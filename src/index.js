const path = require('path')
import {q, qs, create, span, div, p, empty, remove, removeAll, recreate, recreateDiv, log} from './lib/utils.js'
import _ from 'lodash'
import './style.css'
import Split from 'split.js'
import gutter from './lib/sections/vertical.png'
let delegate = require('delegate');

// TODO: убрать
import about from './lib/sections/about.html'
import help from './lib/sections/help.html'
import code from './lib/sections/code.html'
import contacts from './lib/sections/contacts.html'
import screencast from './lib/sections/screencast.html'

// import {segmenter} from '../../segmenter'
import {segmenter} from 'recursive-segmenter'

const {ipcRenderer} = require('electron')
const shell = require('electron').shell
import {installDict, dictList} from './lib/sections/install.js'
import {showDicts} from './lib/sections/dicts.js'
import ambipic from './lib/sections/ambiguity.png'
import recpic from './lib/sections/recursive.png'


let split = Split(['#text', '#results'], {
    sizes: [60, 40],
    cursor: 'col-resize',
    minSize: [0, 0]
});

require('electron').ipcRenderer.on('parsed', (event, res) => {
    split.setSizes([60, 40])
    let oHeader = q('#text')
    oHeader.classList.remove('font16')
    empty(oHeader)
    oHeader.addEventListener("wheel", onWheel)
    let oDicts = q('#laoshi-dicts')
    empty(oDicts)

    if (!res.docs) return
    let oRes = q('#results')
    oRes.dnames = res.dnames
    dictList(res.dnames)

    let mess = doc4seg(res)

    let oMess = headerMessage(mess)
    oHeader.appendChild(oMess)
})

function doc4seg(res) {
    let mess = []
    res.clauses.forEach(clause => {
        if (clause.sp) mess.push({sp: clause.sp})
        else {
            let sres = segmenter(clause.cl, res.docs)
            mess.push({cl: clause.cl, segs: sres.segs, gdocs: sres.gdocs })
        }
    })
    return mess
}

function headerMessage(mess) {
    let oText = create('div')
    mess.forEach(cl => {
        if (cl.segs) {
            let oClause = parseClause(cl)
            oText.appendChild(oClause)
        } else {
            let oSpace = span()
            let sp = cl.sp.replace('\n', '<br><br>')
            oSpace.innerHTML = sp
            oText.appendChild(oSpace)
        }
    })
    return oText
}

let closePopups = function() {
    let oAmbis = q('.ambis')
    if (oAmbis) remove(oAmbis)
    removeAll('.segs')
}

function parseClause(cl) {
    let oClause = create('span')
    oClause.classList.add('clause')
    cl.segs.forEach((seg, idx) => {
        let oSeg = span(seg.dict)
        oSeg.setAttribute('idx', seg.idx)
        oSeg.classList.add('seg')
        oClause.appendChild(oSeg)
    })
    bindOverEvent(oClause, cl)
    bindClickEvent(oClause, cl)
    return oClause
}

function bindOverEvent(el, cl) {
    let oRes = q('#results')
    delegate(el, '.seg', 'mouseover', function(e) {
        if (e.shiftKey) return
        if (e.ctrlKey) return
        if (el.classList.contains('clause')) closePopups()
        moveCurrent(e)
        let dict = e.target.textContent
        let seg = _.find(cl.segs, s => { return s.dict == dict}) || _.find(cl.gdocs, s => { return s.dict == dict})
        if (seg && seg.docs) return showDicts(seg)
        else if (seg && seg.ambis) return createAmbis(e, seg, cl)
    }, false);

}

function bindClickEvent(el, cl) {
    delegate(el, '.seg', 'click', function(e) {
        let oHeader = q('#text')
        if (e.target.textContent.length < 2) return

        let docs = _.values(cl.gdocs)
        docs = _.flatten(docs.map(doc => { return doc.docs}))
        docs = _.filter(docs, (doc) => { return doc.dict.length < e.target.textContent.length })
        let segs = segmenter(e.target.textContent, docs).segs

        if (segs.length == 1 && segs[0].ambis) {
            let aseg = segs[0]
            // let test = q('#ambis')
            // if (test && test.getAttribute('dict') == aseg.dict) return
            createAmbis(e, aseg, cl)
        }
        else createSegPopup(e, segs, cl)
    })
}

function createSegPopup(e, segs, cl) {
    let oHeader = q('#text')
    let oDicts = q('#laoshi-dicts')
    empty(oDicts)
    let oSegs = q('#segs')
    if (oSegs && oSegs.getAttribute('dict') == e.target.textContent) return
    oSegs = recreateDiv('segs')
    oSegs.classList.add('segs')

    segs.forEach(seg => {
        let oseg = span(seg.dict)
        oseg.setAttribute('idx', seg.idx)
        if (seg.docs) oseg.classList.add('seg')
        else oseg.classList.add('ambi')
        oSegs.appendChild(oseg)
        let oSpace = span(' ')
        oSegs.appendChild(oSpace)
    })
    bindOverEvent(oSegs, cl)
    bindClickEvent(oSegs, cl)
    oSegs.setAttribute('dict', e.target.textContent)
    oHeader.appendChild(oSegs)
    let coords = getCoords(e.target);
    placePopup(coords, oSegs);
}

function createAmbis(e, seg, cl) {
    let oHeader = q('#text')
    let oDicts = q('#laoshi-dicts')
    empty(oDicts)
    let oAmbis = q('#ambis')
    if (oAmbis && oAmbis.getAttribute('dict') == seg.dict) return
    oAmbis = recreateDiv('ambis')
    oAmbis.setAttribute('dict', seg.dict)

    seg.ambis.forEach((asegs, idy) => {
        let oAmbi = create('div')
        asegs.forEach((aseg, idx) => {
            let oAseg = span(aseg.dict)
            oAseg.classList.add('seg')
            oAmbi.appendChild(oAseg)
            let oSpace = span(' ')
            oAmbi.appendChild(oSpace)
        })
        oAmbis.appendChild(oAmbi)
    })
    bindOverEvent(oAmbis, cl)
    bindClickEvent(oAmbis, cl)

    oHeader.appendChild(oAmbis)
    let coords = getCoords(e.target);
    placePopup(coords, oAmbis);
}

function moveCurrent(e) {
    let curs = qs('.current')
    curs.forEach(cur => {cur.classList.remove('current')})
    e.target.classList.add('current')
}

function placePopup(coords, el) {
    var top = [coords.top, 'px'].join('');
    var left = [coords.left, 'px'].join('');
    el.style.top = top;
    el.style.left = left;
}

function getCoords(el) {
    let rect = el.getBoundingClientRect();
    return {top: rect.top+28, left: rect.left};
}

function showMessage(str) {
    let parent = q('#antrax-dicts')
    parent.textContent = str
}

ipcRenderer.on('section', function(event, name) {
    let oHeader = q('#text')
    split.setSizes([100, 0])
    closePopups()
    switch (name) {
    case 'about':
        showSection(about)
        break
    case 'help':
        showSection(help)
        let apic = q('#ambipic')
        apic.src = ambipic
        let rpic = q('#recpic')
        rpic.src = recpic
        break
    case 'code':
        showSection(code)
        break
    case 'contacts':
        showSection(contacts)
        break
    case 'screencast':
        showSection(screencast)
        break
    case 'install':
        ipcRenderer.send('config')
        ipcRenderer.on('config', function(event, config) {
            installDict(config)
        })
        break
    }

    delegate(oHeader, '.external', 'click', function(e) {
        let href= e.target.textContent
        shell.openExternal(href)
    })
})


function showSection(sec) {
    let oHeader = q('#text')
    empty(oHeader)
    oHeader.classList.add('font16')
    oHeader.innerHTML = sec
    let odicts = q('#laoshi-dicts')
    empty(odicts)
}

function onWheel(e) {
    let isShift = !!e.shiftKey;
    if (!isShift) return
    let oRes = q('#results')
    oRes.scrollTop += e.deltaY
    e.preventDefault()
}
