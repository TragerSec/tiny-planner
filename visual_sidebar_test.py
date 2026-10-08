from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path('/mnt/data/tp-sidebar-102')
shots=Path('/mnt/data/tp-sidebar-102/screens')
shots.mkdir(exist_ok=True)
css=(root/'styles.css').read_text()
main=(root/'main.js').read_text()
mock=Path('/mnt/data/tp-review-visual/mock.js').read_text()
html='''<!doctype html><html class="theme-dark"><head><meta charset="utf-8"></head><body><div id="app"></div></body></html>'''
variables='''html,body{margin:0;background:#080808;color:#ddd;font:14px system-ui;} .tp-host{height:100vh}.tp-shell{height:100%}#app{height:100vh}.theme-dark{--background-primary:#080808;--background-secondary:#111;--background-modifier-border:#333;--background-modifier-hover:#262626;--text-normal:#ddd;--text-muted:#999;--interactive-accent:#42a4d5;--font-interface:system-ui;--text-on-accent:#000;--tp-outline:#444;--text-faint:#777} .tp-host button{background-color:#282828;}'''
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    for width in (1440, 840, 520):
        page=browser.new_page(viewport={'width':width,'height':900},device_scale_factor=1)
        errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
        page.set_content(html)
        page.add_style_tag(content=variables)
        page.add_style_tag(content=css)
        page.add_script_tag(content=mock)
        page.add_script_tag(content=main)
        page.evaluate('boot()')
        page.wait_for_function('window.ready === true',timeout=15000)
        page.wait_for_timeout(120)
        page.screenshot(path=str(shots/f'nav-{width}-expanded.png'))
        metrics=page.evaluate('''() => {
          const q = s => document.querySelector(s), rect = e => e.getBoundingClientRect(), style = e => getComputedStyle(e);
          const brand = q('.tp-brand'), heading=q('.tp-nav-heading'), nav=q('.tp-nav-button'), ico=q('.tp-nav-icon'), bottom=q('.tp-sidebar-bottom > button'), sidebar=q('.tp-sidebar');
          const navBtns = [...document.querySelectorAll('.tp-nav-button')];
          const nodes=[...document.querySelectorAll('.tp-sidebar-bottom > button')];
          return {width:document.querySelector('.tp-host').clientWidth, mobile:document.querySelector('.tp-host').classList.contains('tp-mobile'), sidebarWidth:rect(sidebar).width, brandX:rect(brand).x, headingX:rect(heading).x+parseFloat(style(heading).paddingLeft), iconX:rect(ico).x, bottomTextX:rect(bottom).x+parseFloat(style(bottom).paddingLeft), navHeights:navBtns.map(n=>rect(n).height), navTopDelta:rect(navBtns[1]).y-rect(navBtns[0]).y, navGap:style(q('.tp-nav-group')).gap,bottomBackgrounds:nodes.map(n=>style(n).backgroundColor),bottomBorder:nodes.map(n=>style(n).borderTopWidth),heightOverflow:q('.tp-sidebar').scrollHeight-q('.tp-sidebar').clientHeight, horizontalOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
        }''')
        print('SIDEBAR',width,metrics, 'errors',errors, flush=True)
        assert not errors
        assert metrics['horizontalOverflow'] <= 2
        assert all(s=='rgba(0, 0, 0, 0)' for s in metrics['bottomBackgrounds'])
        if width==1440:
            assert abs(metrics['brandX']-metrics['headingX']) < 2 and abs(metrics['brandX']-metrics['iconX']) < 2 and abs(metrics['brandX']-metrics['bottomTextX']) < 2,metrics
            assert metrics['navTopDelta'] >= 36,metrics
        toggle=page.locator('[data-menu-toggle]')
        toggle.focus()
        page.keyboard.press('Enter')
        page.wait_for_timeout(120)
        state=page.evaluate('''() => {const s=document.querySelector('.tp-sidebar');return {hidden:s.hidden,display:getComputedStyle(s).display,contentLeft:document.querySelector('.tp-content').getBoundingClientRect().left}}''')
        print('COLLAPSED',width,state,flush=True)
        assert state['hidden'] and state['display']=='none'
        page.screenshot(path=str(shots/f'nav-{width}-collapsed.png'))
        page.locator('[data-menu-toggle]').click()
        page.wait_for_timeout(120)
        assert page.locator('.tp-sidebar').evaluate('(el)=>!el.hidden')
        page.close()
    browser.close()
print('VISUAL REGRESSION: PASSED')
