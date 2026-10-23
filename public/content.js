(() => {
  if (window.__pinDropLoaded) return
  window.__pinDropLoaded = true

  const STORAGE_KEY = 'pindrop:annotations'
  const PAGE_KEY = normalizeUrl(location.href)
  let annotations = []
  let active = false
  let pinsVisible = true
  let selectedElement = null
  let editingId = null
  let filter = 'open'
  let search = ''
  let renderTimer = 0
  let hoveredElement = null
  let editorDirty = false
  let panelOpen = false
  let layoutTimer = 0
  let toastTimer = 0

  const host = document.createElement('div')
  host.id = 'pindrop-root'
  host.style.cssText = 'all: initial; position: static; width: 0; height: 0; pointer-events: none;'
  const shadow = host.attachShadow({ mode: 'closed' })
  const style = document.createElement('style')
  style.textContent = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif; }
    button, input, textarea { font: inherit; }
    button { border: 0; cursor: pointer; }
    button:focus-visible, input:focus-visible, textarea:focus-visible { outline: 3px solid #f6a3aa; outline-offset: 3px; }
    .toolbar, .panel, .editor, .toast { color: #17202a; pointer-events: auto; }
    .toolbar { position: fixed; z-index: 5; left: 50%; bottom: 24px; display: flex; align-items: center; gap: 4px; max-width: calc(100vw - 24px); padding: 7px; border: 1px solid #d9dde2; border-radius: 21px; background: #fffffff0; box-shadow: 0 12px 34px #17202a26, inset 0 1px #fff; backdrop-filter: blur(18px) saturate(140%); transform: translateX(-50%); }
    .toolbar strong { padding: 0 9px; color: #66717c; font-size: 11px; letter-spacing: .01em; white-space: nowrap; }
    .toolbar button { display: inline-flex; align-items: center; justify-content: center; gap: 5px; min-width: 38px; min-height: 38px; padding: 0 9px; border-radius: 14px; background: transparent; color: #35404a; font-size: 11px; font-weight: 650; transition: background .18s ease, color .18s ease, transform .18s ease; }
    .toolbar button svg { width: 18px; height: 18px; }
    .toolbar button:hover { background: #f2f3f5cc; color: #17202a; }
    .toolbar button.active { background: #fee5e7; color: #e63946; }
    .toolbar button:active { transform: translateY(1px); }
    .toolbar .primary, .editor .save { background: #e63946; color: #fff; box-shadow: 0 4px 12px #e6394640; }
    .toolbar .primary:hover, .editor .save:hover { background: #c92e3a; color: #fff; }
    .panel, .editor { position: fixed; border: 1px solid #ffffffb8; background: #fffffff2; box-shadow: 0 18px 52px #17202a2e, inset 0 1px #fff; backdrop-filter: blur(22px) saturate(135%); }
    .panel { top: 72px; right: 18px; width: min(370px, calc(100vw - 28px)); max-height: calc(100vh - 88px); overflow: auto; padding: 17px; border-radius: 20px; }
    .panel h2, .editor h2 { margin: 0; font-size: 17px; letter-spacing: -.02em; }
    .panel-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 14px; }
    .close { width: 32px; height: 32px; border-radius: 10px; background: #f2f3f5b8; color: #66717c; font-size: 20px; }
    .search { width: 100%; padding: 10px 12px; border: 1px solid #d8dde2; border-radius: 10px; background: #ffffffb8; color: #17202a; font-size: 13px; }
    .filters { display: flex; gap: 6px; margin: 11px 0 13px; }
    .filters button { padding: 7px 10px; border-radius: 8px; background: #eef0f2b8; color: #56616b; font-size: 12px; transition: background .18s ease, color .18s ease; }
    .filters button.active { background: #fee5e7; color: #a92531; font-weight: 700; }
    .item { display: block; width: 100%; margin-top: 8px; padding: 12px; border: 1px solid #dfe3e6; border-radius: 12px; background: #ffffffe0; text-align: left; transition: border .18s ease, box-shadow .18s ease, transform .18s ease; }
    .item:hover { border-color: #e63946a8; box-shadow: 0 5px 16px #17202a12; transform: translateY(-1px); }
    .item-top { display: flex; justify-content: space-between; gap: 8px; color: #66717c; font-size: 11px; font-weight: 650; }
    .item p { display: -webkit-box; overflow: hidden; margin: 7px 0 0; color: #17202a; font-size: 13px; line-height: 1.42; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
    .muted, .empty { color: #66717c; font-size: 12px; line-height: 1.45; }
    .editor { left: 50%; top: 50%; width: min(410px, calc(100vw - 28px)); transform: translate(-50%, -50%); padding: 20px; border-radius: 20px; }
    .editor-subtitle { margin: 5px 0 0; color: #66717c; font-size: 12px; }
    .editor textarea { display: block; width: 100%; min-height: 124px; margin: 16px 0 6px; padding: 12px; resize: vertical; border: 1px solid #d1d8dd; border-radius: 11px; background: #ffffffd9; color: #17202a; line-height: 1.45; }
    .shortcut { margin: 0; color: #89929a; font-size: 11px; }
    .error { min-height: 18px; color: #b4232e; font-size: 12px; }
    .actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-top: 16px; }
    .actions button { padding: 9px 13px; border-radius: 9px; font-size: 12px; font-weight: 650; }
    .actions .cancel { background: #eef0f2; color: #17202a; }
    .actions .danger { margin-right: auto; background: #fff0f1; color: #b4232e; }
    .actions .resolve { background: #e9f7ef; color: #16713c; }
    .annotation { position: fixed; display: flex; align-items: flex-start; gap: 7px; pointer-events: none; z-index: 1; }
    .pin { position: relative; z-index: 2; display: grid; place-items: center; width: 30px; min-width: 30px; height: 30px; min-height: 30px; border: 2px solid #ffffff; border-radius: 50%; background: #e63946; color: #fff; font-size: 12px; font-weight: 750; box-shadow: 0 4px 13px #17202a45, 0 0 0 1px #e6394666; transform: translate(-2px, -2px); pointer-events: auto; transition: transform .2s ease, box-shadow .2s ease; animation: pin-in .25s ease both; }
    .pin:hover, .pin:focus-visible { transform: translate(-2px, -2px) scale(1.1); box-shadow: 0 7px 19px #17202a4a, 0 0 0 4px #e6394626; }
    .pin.resolved { background: #269653; box-shadow: 0 4px 13px #17202a38, 0 0 0 1px #26965366; }
    .pin.unresolved { background: #7040b5; }
    .preview { width: 188px; max-height: 58px; overflow: hidden; padding: 8px 10px; border: 1px solid #ffffffaa; border-radius: 11px; background: #ffffffe0; color: #26313a; box-shadow: 0 5px 16px #17202a25, inset 0 1px #fff; backdrop-filter: blur(15px) saturate(125%); opacity: .7; pointer-events: auto; cursor: pointer; transition: opacity .2s ease, max-height .2s ease, transform .2s ease, background .2s ease, border .2s ease, box-shadow .2s ease; }
    .preview:hover, .preview:focus-visible, .annotation:has(.pin:hover) .preview, .annotation:has(.pin:focus-visible) .preview { max-height: 108px; opacity: 1; border-color: #ffffff; background: #fffffff5; box-shadow: 0 10px 25px #17202a35, inset 0 1px #fff; transform: translateY(-2px); }
    .preview-text { display: -webkit-box; overflow: hidden; margin: 0; font-size: 12px; line-height: 1.4; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
    .preview:hover .preview-text, .preview:focus-visible .preview-text { -webkit-line-clamp: 5; }
    .preview-meta { display: flex; align-items: center; gap: 5px; margin-top: 5px; color: #66717c; font-size: 10px; font-weight: 650; }
    .status-dot { width: 6px; height: 6px; border-radius: 50%; background: #e63946; }
    .status-dot.resolved { background: #269653; }
    .banner { position: fixed; left: 18px; bottom: 18px; padding: 10px 13px; border: 1px solid #ffffff33; border-radius: 11px; background: #17202ae8; color: #fff; font-size: 12px; box-shadow: 0 8px 23px #17202a33; backdrop-filter: blur(12px); }
    @keyframes pin-in { from { opacity: 0; transform: translate(-2px, -2px) scale(.75); } to { opacity: 1; transform: translate(-2px, -2px) scale(1); } }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; scroll-behavior: auto !important; } }
    @media (max-width: 620px) { .toolbar { bottom: 12px; gap: 1px; padding: 5px; } .toolbar strong { display: none; } .toolbar button { min-width: 34px; padding: 0 6px; } .toolbar button:not(.active) { font-size: 0; } .toolbar button svg { width: 19px; height: 19px; } }
  `
  shadow.append(style)
  const ui = document.createElement('div')
  const toolbarLayer = document.createElement('div')
  const annotationLayer = document.createElement('div')
  const surfaceLayer = document.createElement('div')
  ui.append(toolbarLayer, annotationLayer, surfaceLayer)
  shadow.append(ui)
  document.documentElement.append(host)
  const pageStyle = document.createElement('style')
  pageStyle.dataset.pindrop = 'hover'
  pageStyle.textContent = '.pindrop-hover-target { outline: 2px solid #e63946 !important; outline-offset: 3px !important; cursor: crosshair !important; }'
  document.documentElement.append(pageStyle)

  function makeIcon(pathData) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 24 24')
    svg.setAttribute('aria-hidden', 'true')
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', pathData)
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke', 'currentColor')
    path.setAttribute('stroke-width', '1.8')
    path.setAttribute('stroke-linecap', 'round')
    path.setAttribute('stroke-linejoin', 'round')
    svg.append(path)
    return svg
  }

  const icons = {
    profile: 'M20 21a8 8 0 0 0-16 0M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
    pins: 'M12 3v18M5 7h14M7 7l1 14h8l1-14',
    mention: 'M16 8.5a4.5 4.5 0 1 0 1.3 3.2V8.5M17.3 11.7c0 2.4 1.2 3.8 2.7 3.8 1.1 0 1.8-.5 2.1-1.1M17.3 11.7C17.3 7.8 14.8 5 11.5 5A6.5 6.5 0 1 0 17 17',
    comments: 'M4 5.5h16v11H8l-4 3v-14ZM8 9h8M8 12h5',
    edit: 'M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4',
    pages: 'M5 5h14v14H5zM8 9h8M8 13h6',
  }

  function normalizeUrl(url) {
    try {
      const value = new URL(url)
      value.hash = ''
      value.searchParams.sort()
      return value.toString().replace(/\/$/, '')
    } catch {
      return url.split('#')[0].replace(/\/$/, '')
    }
  }

  function getStored() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }
        resolve(Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : [])
      })
    })
  }

  function saveStored() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [STORAGE_KEY]: annotations }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }
        resolve()
      })
    })
  }

  function textOf(element) {
    return (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 180)
  }

  function selectorOf(element) {
    if (element.id && /^[A-Za-z][\w-]*$/.test(element.id)) return `#${CSS.escape(element.id)}`
    const parts = []
    let current = element
    while (current && current !== document.body && parts.length < 5) {
      let part = current.tagName.toLowerCase()
      if (current.classList.length) {
        const safeClass = [...current.classList].find((name) => /^[A-Za-z][\w-]*$/.test(name))
        if (safeClass) part += `.${CSS.escape(safeClass)}`
      }
      const parent = current.parentElement
      if (parent) {
        const siblings = [...parent.children].filter((child) => child.tagName === current.tagName)
        if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(current) + 1})`
      }
      parts.unshift(part)
      current = parent
    }
    return parts.join(' > ')
  }

  function anchorFor(element) {
    const rect = element.getBoundingClientRect()
    return {
      selector: selectorOf(element),
      tag: element.tagName.toLowerCase(),
      text: textOf(element),
      ariaLabel: element.getAttribute('aria-label') || '',
      role: element.getAttribute('role') || '',
      parentText: textOf(element.parentElement || element).slice(0, 220),
      rect: { x: Math.round(rect.left), y: Math.round(rect.top), width: Math.round(rect.width), height: Math.round(rect.height) },
    }
  }

  function targetFor(annotation) {
    const anchor = annotation.anchor
    if (!anchor) return null
    if (anchor.selector) {
      try {
        const match = document.querySelector(anchor.selector)
        if (match && matchesAnchor(match, anchor)) return match
      } catch {
        // The saved selector may be invalid after a page update.
      }
    }
    const candidates = [...document.querySelectorAll(anchor.tag || '*')].filter((element) => matchesAnchor(element, anchor))
    return candidates.length === 1 ? candidates[0] : null
  }

  function matchesAnchor(element, anchor) {
    if (anchor.tag && element.tagName.toLowerCase() !== anchor.tag) return false
    if (anchor.ariaLabel && element.getAttribute('aria-label') !== anchor.ariaLabel) return false
    if (anchor.role && element.getAttribute('role') !== anchor.role) return false
    if (anchor.text && !textOf(element).startsWith(anchor.text.slice(0, 80))) return false
    return true
  }

  function visibleAnnotations() {
    return annotations.filter((item) => {
      const matchesFilter = filter === 'all' || (filter === 'resolved' ? item.resolved : !item.resolved)
      const matchesSearch = !search || item.comment.toLowerCase().includes(search.toLowerCase())
      return matchesFilter && matchesSearch
    })
  }

  function showEditor(annotation) {
    editingId = annotation ? annotation.id : null
    editorDirty = false
    const editor = document.createElement('section')
    editor.className = 'editor'
    editor.setAttribute('role', 'dialog')
    editor.setAttribute('aria-labelledby', 'pindrop-editor-title')
    editor.innerHTML = ''
    const title = document.createElement('h2')
    title.id = 'pindrop-editor-title'
    title.textContent = annotation ? `Edit comment · #${annotations.indexOf(annotation) + 1}` : 'Add a comment'
    const subtitle = document.createElement('p')
    subtitle.className = 'editor-subtitle'
    subtitle.textContent = annotation ? (annotation.resolved ? 'This annotation is resolved.' : 'Keep the review moving with a clear note.') : 'Add context for your future self or team.'
    const textarea = document.createElement('textarea')
    textarea.id = 'pindrop-comment'
    textarea.maxLength = 2000
    textarea.placeholder = 'Describe what needs attention…'
    textarea.value = annotation ? annotation.comment : ''
    const error = document.createElement('div')
    error.className = 'error'
    error.setAttribute('aria-live', 'polite')
    const shortcut = document.createElement('p')
    shortcut.className = 'shortcut'
    shortcut.textContent = 'Ctrl/Cmd + Enter to save · Esc to cancel'
    const actions = document.createElement('div')
    actions.className = 'actions'
    if (annotation) {
      const remove = document.createElement('button')
      remove.className = 'danger'
      remove.textContent = 'Delete'
      remove.type = 'button'
      remove.addEventListener('click', () => removeAnnotation(annotation.id))
      actions.append(remove)
      const resolve = document.createElement('button')
      resolve.className = 'resolve'
      resolve.textContent = annotation.resolved ? 'Reopen' : 'Resolve'
      resolve.type = 'button'
      resolve.addEventListener('click', () => toggleResolved(annotation.id))
      actions.append(resolve)
    }
    const cancel = document.createElement('button')
    cancel.className = 'cancel'
    cancel.textContent = 'Cancel'
    cancel.type = 'button'
    cancel.addEventListener('click', closeEditor)
    const save = document.createElement('button')
    save.className = 'save'
    save.textContent = 'Save comment'
    save.type = 'button'
    save.addEventListener('click', () => saveAnnotation(textarea.value, error))
    actions.append(cancel, save)
    editor.append(title, subtitle, textarea, error, shortcut, actions)
    surfaceLayer.replaceChildren(editor)
    textarea.focus()
    textarea.addEventListener('input', () => { editorDirty = textarea.value !== (annotation ? annotation.comment : '') })
    textarea.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeEditor()
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') save.click()
    })
  }

  function closeEditor(force = false) {
    if (!force && editorDirty && !window.confirm('Discard your unsaved comment?')) return
    editingId = null
    editorDirty = false
    render()
  }

  async function saveAnnotation(value, error) {
    const comment = value.trim()
    if (!comment) {
      error.textContent = 'Add a comment before saving.'
      return
    }
    if (!editingId && !selectedElement) {
      error.textContent = 'Select a page element first.'
      return
    }
    const now = new Date().toISOString()
    if (editingId) {
      const item = annotations.find((entry) => entry.id === editingId)
      if (item) {
        item.comment = comment
        item.updatedAt = now
      }
    } else {
      annotations.push({
        id: crypto.randomUUID(),
        pageUrl: location.href,
        pageKey: PAGE_KEY,
        comment,
        createdAt: now,
        updatedAt: now,
        resolved: false,
        anchor: anchorFor(selectedElement),
      })
    }
    try {
      await saveStored()
      selectedElement = null
      editorDirty = false
      closeEditor(true)
    } catch (storageError) {
      error.textContent = storageError instanceof Error ? storageError.message : 'Could not save this comment.'
    }
  }

  async function removeAnnotation(id) {
    annotations = annotations.filter((item) => item.id !== id)
    try {
      await saveStored()
      closeEditor()
    } catch {
      showToast('Could not delete the comment.')
    }
  }

  async function toggleResolved(id) {
    const item = annotations.find((entry) => entry.id === id)
    if (!item) return
    item.resolved = !item.resolved
    item.updatedAt = new Date().toISOString()
    try {
      await saveStored()
      if (editingId === id) {
        const updated = item
        editingId = null
        editorDirty = false
        render()
        showEditor(updated)
      } else {
        render()
      }
    } catch {
      showToast('Could not update the comment.')
    }
  }

  function showToast(message) {
    if (toastTimer) window.clearTimeout(toastTimer)
    ui.querySelector('.banner.toast')?.remove()
    const toast = document.createElement('div')
    toast.className = 'banner toast'
    toast.textContent = message
    surfaceLayer.append(toast)
    toastTimer = window.setTimeout(() => toast.remove(), 3000)
  }

  function positionAnnotations() {
    const occupied = []
    annotationLayer.querySelectorAll('.annotation').forEach((wrapper) => {
      const annotation = annotations.find((item) => item.id === wrapper.dataset.annotationId)
      const target = annotation && targetFor(annotation)
      if (!target) return
      const rect = target.getBoundingClientRect()
      const width = wrapper.getBoundingClientRect().width
      let left = rect.left
      let top = rect.top
      if (left + width > window.innerWidth - 8) left = rect.right - width
      if (left < 8) left = 8
      top = Math.max(8, Math.min(window.innerHeight - 42, top))
      let candidate = { left, top, right: left + width, bottom: top + 38 }
      let attempts = 0
      while (occupied.some((item) => candidate.left < item.right && candidate.right > item.left && candidate.top < item.bottom && candidate.bottom > item.top) && attempts < 5) {
        top += 42
        if (top + 38 > window.innerHeight - 8) top = Math.max(8, rect.top - 42 * (attempts + 1))
        candidate = { left, top, right: left + width, bottom: top + 38 }
        attempts += 1
      }
      wrapper.style.left = `${left}px`
      wrapper.style.top = `${top}px`
      occupied.push(candidate)
    })
  }

  function render() {
    if (editingId) return
    toolbarLayer.replaceChildren()
    annotationLayer.replaceChildren()
    const toolbar = document.createElement('div')
    toolbar.className = 'toolbar'
    toolbar.setAttribute('role', 'toolbar')
    toolbar.setAttribute('aria-label', 'PinDrop annotation controls')
    const label = document.createElement('strong')
    label.textContent = active ? `Annotating · ${annotations.length}` : `PinDrop · ${annotations.length}`
    toolbar.append(label)

    function addToolbarButton(labelText, iconName, handler, activeState = false) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = activeState ? 'active' : ''
      button.append(makeIcon(icons[iconName]), document.createTextNode(labelText))
      button.title = labelText
      button.setAttribute('aria-label', labelText)
      button.addEventListener('click', (event) => {
        event.stopPropagation()
        handler()
      })
      toolbar.append(button)
    }

    addToolbarButton('Profile', 'profile', () => showToast('Local profile · no account connected.'))
    addToolbarButton(pinsVisible ? 'Hide pins' : 'Show pins', 'pins', () => { pinsVisible = !pinsVisible; render() }, pinsVisible)
    addToolbarButton('Mentions coming soon', 'mention', () => showToast('Mentions are not available in local mode.'))
    addToolbarButton(`Comments${annotations.length ? ` · ${annotations.length}` : ''}`, 'comments', () => { panelOpen = true; showPanel() }, panelOpen)
    addToolbarButton(active ? 'Exit annotating' : 'Add annotation', 'edit', () => { active ? stop() : start() }, active)
    addToolbarButton('Current page', 'pages', () => showToast(`${annotations.length} local annotation${annotations.length === 1 ? '' : 's'} on this page.`))
    toolbarLayer.append(toolbar)

    if (active) {
      const banner = document.createElement('div')
      banner.className = 'banner'
      banner.textContent = 'Click an element to add a comment. Press Escape to stop.'
      surfaceLayer.append(banner)
    }
    const unresolved = annotations.filter((item) => !targetFor(item)).length
    if (unresolved && !panelOpen) showToast(`${unresolved} comment${unresolved === 1 ? '' : 's'} need re-anchoring.`)

    if (pinsVisible) {
      annotations.forEach((annotation, index) => {
        const target = targetFor(annotation)
        if (!target) return
        const rect = target.getBoundingClientRect()
        const wrapper = document.createElement('div')
        wrapper.className = 'annotation'
        wrapper.dataset.annotationId = annotation.id
        wrapper.style.left = `${Math.max(8, Math.min(window.innerWidth - 38, rect.left))}px`
        wrapper.style.top = `${Math.max(8, Math.min(window.innerHeight - 38, rect.top))}px`
        const pin = document.createElement('button')
        pin.className = `pin${annotation.resolved ? ' resolved' : ''}`
        pin.textContent = String(index + 1)
        pin.title = annotation.comment
        pin.setAttribute('aria-label', `Open comment ${index + 1}`)
        pin.addEventListener('click', (event) => {
          event.stopPropagation()
          showEditor(annotation)
        })
        wrapper.append(pin)
        if (annotation.comment) {
          const preview = document.createElement('button')
          preview.className = 'preview'
          preview.type = 'button'
          preview.setAttribute('aria-label', `Preview comment ${index + 1}`)
          const previewText = document.createElement('span')
          previewText.className = 'preview-text'
          previewText.textContent = annotation.comment
          const meta = document.createElement('span')
          meta.className = 'preview-meta'
          const dot = document.createElement('span')
          dot.className = `status-dot${annotation.resolved ? ' resolved' : ''}`
          const status = document.createElement('span')
          status.textContent = annotation.resolved ? 'Resolved' : 'Open'
          meta.append(dot, status)
          preview.append(previewText, meta)
          preview.addEventListener('click', (event) => {
            event.stopPropagation()
            showEditor(annotation)
          })
          wrapper.append(preview)
        }
        annotationLayer.append(wrapper)
      })
    }
    requestAnimationFrame(positionAnnotations)
    panelOpen = false
  }

  function showPanel() {
    const panel = document.createElement('section')
    panel.className = 'panel'
    panel.setAttribute('role', 'dialog')
    panel.setAttribute('aria-labelledby', 'pindrop-comments-title')
    const header = document.createElement('div')
    header.className = 'panel-header'
    const title = document.createElement('h2')
    title.id = 'pindrop-comments-title'
    title.textContent = `${annotations.length} comment${annotations.length === 1 ? '' : 's'}`
    const close = document.createElement('button')
    close.className = 'close'
    close.textContent = '×'
    close.setAttribute('aria-label', 'Close comments')
    close.addEventListener('click', () => { panelOpen = false; render() })
    header.append(title, close)
    const searchBox = document.createElement('input')
    searchBox.className = 'search'
    searchBox.placeholder = 'Search comments'
    searchBox.value = search
    searchBox.setAttribute('aria-label', 'Search comments')
    searchBox.addEventListener('input', () => {
      search = searchBox.value
      const cursorPosition = searchBox.selectionStart || search.length
      showPanel()
      const nextSearchBox = shadow.querySelector('.search')
      if (nextSearchBox instanceof HTMLInputElement) {
        nextSearchBox.focus()
        nextSearchBox.setSelectionRange(cursorPosition, cursorPosition)
      }
    })
    const filters = document.createElement('div')
    filters.className = 'filters'
    ;[['open', 'Open'], ['resolved', 'Resolved'], ['all', 'All']].forEach(([value, text]) => {
      const button = document.createElement('button')
      button.textContent = text
      button.className = filter === value ? 'active' : ''
      button.addEventListener('click', () => { filter = value; showPanel() })
      filters.append(button)
    })
    panel.append(header, searchBox, filters)
    const entries = visibleAnnotations()
    if (!entries.length) {
      const empty = document.createElement('p')
      empty.className = 'empty'
      empty.textContent = annotations.length ? 'No comments match this filter.' : 'No comments on this page yet.'
      panel.append(empty)
    }
    entries.forEach((annotation) => {
      const target = targetFor(annotation)
      const item = document.createElement('button')
      item.className = 'item'
      item.type = 'button'
      const top = document.createElement('div')
      top.className = 'item-top'
      const number = document.createElement('span')
      number.textContent = `#${annotations.indexOf(annotation) + 1}`
      const state = document.createElement('span')
      state.textContent = target ? (annotation.resolved ? 'Resolved' : 'Open') : 'Needs attention'
      top.append(number, state)
      const text = document.createElement('p')
      text.textContent = annotation.comment
      item.append(top, text)
      item.addEventListener('click', () => {
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' })
        panelOpen = false
        showEditor(annotation)
      })
      panel.append(item)
    })
    surfaceLayer.replaceChildren(panel)
  }

  function start() {
    active = true
    render()
  }

  function stop() {
    active = false
    selectedElement = null
    if (hoveredElement) {
      hoveredElement.classList.remove('pindrop-hover-target')
      hoveredElement = null
    }
    render()
  }

  document.addEventListener('mouseover', (event) => {
    if (!active || !(event.target instanceof Element)) return
    if (event.target.closest('#pindrop-root')) return
    if (hoveredElement) hoveredElement.classList.remove('pindrop-hover-target')
    hoveredElement = event.target
    event.target.classList.add('pindrop-hover-target')
  }, true)

  document.addEventListener('click', (event) => {
    if (!active || !(event.target instanceof Element) || event.target.closest('#pindrop-root')) return
    event.preventDefault()
    event.stopImmediatePropagation()
    selectedElement = event.target
    showEditor()
  }, true)

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && active && !editingId) stop()
  }, true)

  window.addEventListener('scroll', () => {
    if (!renderTimer) renderTimer = requestAnimationFrame(() => { renderTimer = 0; positionAnnotations() })
  }, true)
  window.addEventListener('resize', () => positionAnnotations())

  const observer = new MutationObserver((records) => {
    if (records.some((record) => !host.contains(record.target))) {
      if (!layoutTimer) {
        layoutTimer = window.setTimeout(() => {
          layoutTimer = 0
          if (!editingId && !panelOpen) render()
        }, 180)
      }
    }
  })
  observer.observe(document.body, { childList: true, subtree: true, attributes: true })

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'start') {
      start()
      sendResponse({ count: annotations.length })
    } else if (message.action === 'stop') {
      stop()
      sendResponse({ count: annotations.length })
    } else if (message.action === 'getState') {
      sendResponse({ active, count: annotations.length })
    }
    return true
  })

  getStored().then((stored) => {
    annotations = stored.filter((item) => item && item.pageKey === PAGE_KEY)
    render()
  }).catch(() => showToast('Could not load saved comments for this page.'))
})()
