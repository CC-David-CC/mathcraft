#!/usr/bin/env python3
"""Run the distributed app and Octave WASM in a real, network-isolated Chromium."""
import functools
import http.server
import json
import os
from pathlib import Path
import tempfile
import threading
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
class Static(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
    def copyfile(self,source,output):
        try:super().copyfile(source,output)
        except (BrokenPipeError,ConnectionResetError):pass  # Cancelling a worker can interrupt a WASM download.

def main():
    with http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Static,directory=str(ROOT))) as server, sync_playwright() as driver, tempfile.TemporaryDirectory() as tmp:
        threading.Thread(target=server.serve_forever,daemon=True).start()
        browser=driver.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH') or None)
        ctx=browser.new_context(viewport={'width':1240,'height':900},accept_downloads=True)
        external=[];errors=[]
        def route(request):
            if urlsplit(request.request.url).hostname=='127.0.0.1':request.continue_()
            else: external.append(request.request.url);request.abort()
        ctx.route('**/*',route)
        page=ctx.new_page();page.set_default_timeout(14000);page.on('pageerror',lambda e: errors.append(str(e)))
        page.on('dialog',lambda d:d.accept())
        url='http://127.0.0.1:'+str(server.server_port)+'/'
        page.goto(url)
        item=lambda i:page.locator('[data-id="'+i+'"]')
        tab=lambda name:page.locator('[data-tab="'+name+'"]').click()
        def check(text):print('PASS '+text,flush=True)
        expect(page.get_by_role('heading',name='Lab library')).to_be_visible()
        for lab in ['horizontal','rail','upright','xtheta','pendulum']:
            page.locator('[data-lab='+lab+']').click()
            item('execute').click()
            expect(item('halt')).to_be_disabled(timeout=45000)
            assert item('status').text_content()=='Lab finished.', (lab,item('codeOutput').inner_text())
            expect(item('plot')).to_be_visible()
            item('library').click()
        item('pickcode').set_input_files([
            {'name':'calculate.m','mimeType':'text/plain','buffer':b'disp(triple(14));'},
            {'name':'triple.m','mimeType':'text/plain','buffer':b'function y=triple(x); y=3*x; endfunction'}])
        item('execute').click();expect(item('codeOutput')).to_have_text('42')
        with page.expect_download() as exported:item('save').click()
        saved=Path(tmp)/'custom.mathcraft';exported.value.save_as(saved)
        item('library').click();item('picksheet').set_input_files(saved)
        expect(item('codeTitle')).to_have_value('calculate');item('execute').click()
        expect(item('codeOutput')).to_have_text('42')
        item('library').click();page.locator('[data-lab=rotor]').click()
        check('Five editable numerical labs plotted their responses; custom main and helper files saved, reopened and executed')
        expect(item('engine')).to_have_text('GNU Octave 7.2.0')
        expect(item('amp')).to_have_text('10');expect(item('natural')).to_have_text('954.9')
        expect(item('rows').locator('tr')).to_have_count(15);check('Octave 7.2.0 boots offline and computes the default lab and 15 measured-speed predictions')
        item('pin').click();expect(item('reflegend')).to_be_visible()
        item('damping').fill('10');expect(item('amp')).to_have_text('5')
        item('replay').click();expect(item('verdict')).to_contain_text('Replay matched')
        for mode in ['phase','residual','amplitude']:
            page.locator('[data-mode="'+mode+'"]').click()
            item('chart').focus();page.keyboard.press('Home');page.keyboard.press('ArrowRight')
            expect(item('readout')).to_contain_text('rpm')
        assert item('chart').evaluate("""c=>{const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let teal=0;for(let i=0;i<p.length;i+=4)if(p[i]<40&&p[i+1]>85&&p[i+1]<150&&p[i+2]>60&&p[i+2]<140)teal++;return teal>70;}""")
        check('10% damping gives 5 mm, saved 5% reference replays, three real canvas plots and keyboard inspection work')
        item('fit').click();expect(item('status')).to_contain_text('Fitted damping')
        assert abs(float(item('damping').input_value())-8)<.02
        assert abs(float(item('rmse').inner_text())-.02313)<.0001
        with page.expect_download() as get:item('export').click()
        residual=Path(tmp)/'res.csv';get.value.save_as(residual)
        records=residual.read_text().splitlines();assert len(records)==16
        for line in records[1:]:
            _,meas,pred,diff,_=map(float,line.split(','));assert abs(meas-pred-diff)<1e-12
        check('bounded damping fit and exported signed residuals match the measured-speed data')
        with page.expect_download() as get:item('save').click()
        worksheet=Path(tmp)/'saved.mathcraft';get.value.save_as(worksheet);saved=json.loads(worksheet.read_text())
        assert saved['reference']['inputs']['params']['damping_ratio']==.05
        assert abs(saved['params']['damping_ratio']-.08)<.0002
        assert saved['dataset']['csv']==(ROOT/'examples/synthetic-run.csv').read_text()
        if os.getenv('MATHCRAFT_SAMPLE_OUT'):
            Path(os.environ['MATHCRAFT_SAMPLE_OUT']).write_bytes(worksheet.read_bytes())
        item('damping').fill('0');expect(item('amp')).to_have_text('—');expect(item('status')).to_contain_text('No finite')
        item('unbalance_g_mm').fill('0');expect(item('amp')).to_have_text('0')
        item('mass_kg').fill('0');expect(item('status')).to_contain_text('positive mass');expect(item('fit')).to_be_disabled()
        item('picksheet').set_input_files(worksheet);expect(item('status')).to_contain_text('Opened worksheet')
        item('replay').click();expect(item('verdict')).to_contain_text('Replay matched')
        check('worksheet round trip restores editable inputs, raw observations, pinned source and replayable outputs; singular and zero-force cases handled')
        item('clear').click();expect(item('count')).to_contain_text('0 of 0')
        item('pickcsv').set_input_files({'name':'bench.csv','mimeType':'text/csv','buffer':b'rpm,amplitude_mm\n700,1.2\n700,1.22\n1000,4.1\n'})
        expect(item('rows').locator('tr')).to_have_count(3);expect(item('dataset')).to_contain_text('bench.csv')
        item('fit').click();expect(item('status')).to_contain_text('three distinct positive')
        item('pickcsv').set_input_files({'name':'bad.csv','mimeType':'text/csv','buffer':b'rpm,miles\n1,1'})
        expect(item('status')).to_contain_text('Expected rpm,amplitude_mm');expect(item('rows').locator('tr')).to_have_count(3)
        check('imported measurements keep repeated speeds, failed CSV import preserves prior data and underdetermined fit explains the requirement')
        tab('model');model=item('source').input_value();item('source').fill(model.replace('1e-3 *','2e-3 *'))
        item('run').click();expect(item('status')).to_have_text('Worksheet calculated.')
        tab('lab');assert 12.49<float(item('amp').inner_text())<12.53
        item('replay').click();expect(item('verdict')).to_contain_text('Replay matched')
        tab('model');item('source').fill('function [a,ph] = unbalance(rpm,p)\n error("intentional model error");\nendfunction')
        item('run').click();expect(item('status')).to_contain_text('intentional model error')
        item('source').fill(model);item('run').click();expect(item('status')).to_have_text('Worksheet calculated.')
        item('runscript').click();expect(item('stdout')).to_contain_text('Natural speed: 954.930 rpm')
        item('pickscript').set_input_files({'name':'matrix.m','mimeType':'text/plain','buffer':b'A=[1 2;3 4]; disp(det(A)); disp(i*i);'})
        expect(item('script')).to_have_value('A=[1 2;3 4]; disp(det(A)); disp(i*i);')
        item('runscript').click();expect(item('stdout')).to_have_text('-2\n-1')
        item('pickscript').set_input_files(ROOT/'lab/check_unbalance.m');expect(item('status')).to_have_text('Scratch script imported.')
        item('runscript').click();expect(item('stdout')).to_contain_text('Rotating-unbalance reference checks passed.')
        item('script').fill('disp("loop entered"); fflush(stdout); while true\nendwhile');item('runscript').click();expect(item('stdout')).to_have_text('loop entered')
        item('stop').click();expect(item('stdout')).to_have_text('Stopped.')
        item('script').fill('disp(42)');item('runscript').click();expect(item('stdout')).to_have_text('42')
        check('editable .m source changes the actual Octave output, model errors recover, general .m matrix/complex code runs, and an infinite loop can be stopped')
        tab('lab');page.set_viewport_size({'width':390,'height':844});expect(item('chart')).to_be_visible()
        assert page.locator('.mc-app').evaluate("n=>n.scrollWidth<=n.clientWidth+1")
        check('narrow viewport fits without horizontal page overflow')
        item('picksheet').set_input_files(ROOT/'examples/fitted-rotor.mathcraft')
        expect(item('status')).to_contain_text('Opened worksheet')
        assert abs(float(item('damping').input_value())-8)<.02
        item('replay').click();expect(item('verdict')).to_contain_text('Replay matched')
        check('the supplied fitted-rotor.mathcraft example replays on the current engine')
        page.set_viewport_size({'width':1240,'height':900})
        if os.getenv('MATHCRAFT_SCREENSHOT'):page.screenshot(path=os.environ['MATHCRAFT_SCREENSHOT'])
        host=ctx.new_page();host.goto(url+'tests/host.html')
        expect(host.locator('output')).to_have_text('PASS',timeout=30000)
        check('two mounted WebOS windows save to a versioned account fixture, reopen from Files and replay without sharing state; lifecycle closes cleanly')
        assert not errors,errors
        assert not external,external
        ctx.close();browser.close();server.shutdown()
        print('Browser suite passed. No external HTTP requests.',flush=True)
if __name__=='__main__':main()
