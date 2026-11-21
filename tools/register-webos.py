#!/usr/bin/env python3
"""Show or apply the app registration for the known KSU.CODES desktop layout."""
import argparse
import difflib
from pathlib import Path

def add(text, anchor, addition, marker, *, after=False, title='registration'):
    if marker in text:
        if text.count(marker) != 1:
            raise ValueError(f'Ambiguous existing {title}.')
        return text
    if text.count(anchor) != 1:
        raise ValueError(f'Expected one {title} anchor {anchor!r}. Adapt this registration to the current checkout.')
    return text.replace(anchor, anchor+addition if after else addition+anchor, 1)

def desktop(text):
    lines=text.splitlines(keepends=True)
    rules=[
        ("const accountDocumentNames=Object.freeze({","Object.freeze({","mathcraft:'MathCraft',"),
        ("const path = ","weatherIcons[key]","(key === 'mathcraft' ? 'assets/desktop/mathcraft.svg' : null) || "),
        ("{name:'Programming',icon:'notebook',children:[","children:[","...(enabledApp('mathcraft')?[{name:'MathCraft',icon:'mathcraft'}]:[]),"),
        ("const applicationIds=Object.freeze({","Object.freeze({","'MathCraft':'mathcraft',"),
        ("const applicationDisplayNames=Object.freeze({","Object.freeze({","mathcraft:['MathCraft','MathCraft'],"),
        ("restoreLayout(){","allowed=new Set([","...(enabledApp('mathcraft')?['mathcraft']:[]),"),
        ("const names={","const names={","mathcraft:'MathCraft',"),
        ("win.appView?.lifecycle:undefined;","const life=[","'mathcraft',"),
    ]
    for selector,anchor,value in rules:
        candidates=[i for i,v in enumerate(lines) if selector in v and (anchor in v or value in v) and (selector!="const names={" or "calculator:'Calculator'" in v)]
        if len(candidates)!=1: raise ValueError('Desktop anchor moved: '+selector)
        i=candidates[0]
        lines[i]=add(lines[i],anchor,value,value,after=(anchor!='weatherIcons[key]'),title=selector)
    return ''.join(lines)

def association(text):
    return add(text,'export function accountFileApp(path, sourceApp) {\n',
               "  if (/[.]mathcraft$/i.test(path)) return 'mathcraft';\n","return 'mathcraft';",after=True)

BUILD="""// MathCraft has an independent app checkout and a browser-local Octave runtime.
{
  const id = 'mathcraft', appRoot = 'apps/' + id;
  const manifest = appRoot + '/webos-files.json';
  let inventory;
  try { inventory = await readFile(path.join(root, manifest)); }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
  if (inventory) {
    sourceInputs.set(manifest, hash(inventory));
    const names = JSON.parse(inventory);
    if (!Array.isArray(names) || new Set(names).size !== names.length ||
        !['app.mjs','icon.svg','vendor/octave/octave.wasm'].every(n => names.includes(n)) ||
        names.some(n => typeof n !== 'string' || !safe(n) || n.split('/').some(s => !s || s === '.' || s === '..') ||
          !/^(app[.]mjs|icon[.]svg|(?:src|lab|examples|vendor[/]octave)[/][a-zA-Z0-9._-]+)$/.test(n)))
      throw Error('Invalid MathCraft app inventory');
    const bundle = [];
    for (const name of names) {
      const source = appRoot + '/' + name, bytes = await readFile(path.join(root, source));
      sourceInputs.set(source, hash(bytes));
      bundle.push({name: name === 'app.mjs' ? 'index.mjs' : name, bytes});
      if (name === 'icon.svg') await put('assets/desktop/mathcraft.svg', bytes);
    }
    await registerFiles(id, bundle);
    // The corresponding source is available separately from the startup payload.
    for (const name of ['source-3996ed4.tar.xz', 'PROVENANCE.md','GNU-GPL-3.txt','WASM-wrapper.LICENSE','EMSCRIPTEN.LICENSE','prepare-no-eval.mjs','SHA256SUMS']) {
      const source = appRoot + '/vendor/octave/' + name, bytes = await readFile(path.join(root, source));
      sourceInputs.set(source, hash(bytes));
      await put('assets/legal/mathcraft/' + name, bytes);
    }
  }
}
"""
def viewer(text):
    return add(text,"await put('assets/desktop/apps.json'",BUILD,"const id = 'mathcraft', appRoot")
def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root',type=Path)
    parser.add_argument('--apply',action='store_true')
    args=parser.parse_args()
    root=args.root.resolve()
    if not (root/'apps/mathcraft/webos-files.json').is_file(): parser.exit(1,'Install the MathCraft checkout at apps/mathcraft first.\n')
    targets=[('platform/desktop/active-system/app.js',desktop),('assembly/viewer/file-associations.mjs',association),('scripts/build_viewer.mjs',viewer)]
    changes=[]
    try:
        for name,transform in targets:
            path=root/name
            original=path.read_bytes().decode()
            eol='\r\n' if '\r\n' in original else '\n'
            result=transform(original.replace('\r\n','\n')).replace('\n',eol)
            if result!=original:changes.append((path,name,original,result))
    except (OSError,ValueError) as exc: parser.exit(1,str(exc)+'\n')
    if not changes: print('MathCraft registrations already present.');return
    for path,name,old,new in changes:
        if args.apply:
            path.write_bytes(new.encode());print('Updated '+name)
        else:
            print(''.join(difflib.unified_diff(old.splitlines(True),new.splitlines(True),'a/'+name,'b/'+name,n=2)),end='')
if __name__=='__main__':main()
