"""Exercise desktop and viewer registration, including the production asset inventory."""
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('register_webos',ROOT/'tools/register-webos.py')
registration=importlib.util.module_from_spec(spec)
spec.loader.exec_module(registration)

class Registration(unittest.TestCase):
    def test_desktop_preserves_neighbors_and_accepts_reruns(self):
        baseline="""const accountDocumentNames=Object.freeze({text:'Text Editor'});
const path = weatherIcons[key] || (direct ? key : reference.icons[key]);
const menu=[{name:'Programming',icon:'notebook',children:[{name:'Python Notebook — Browser'}]}];
const applicationIds=Object.freeze({'Weather':'weather'});
const applicationDisplayNames=Object.freeze({weather:['Weather','Weather']});
const desktop={restoreLayout(){const allowed=new Set(['weather']);}};
const names={weather:'Weather',calculator:'Calculator'};
const life=['text','wordcraft'].includes(w?.app)?win.appView?.lifecycle:undefined;
"""
        for original in [baseline,baseline.replace("children:[","children:[...drakonEntries,")]:
            result=registration.desktop(original)
            self.assertEqual(registration.desktop(result),result)
            self.assertIn("name:'Python Notebook — Browser'",result)
            self.assertIn("name:'MathCraft'",result)
            self.assertEqual('...drakonEntries' in original,'...drakonEntries' in result)
        with self.assertRaises(ValueError):registration.desktop('some other desktop')
    def test_viewer_build_and_file_association(self):
        baseline="""import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const [root,out]=process.argv.slice(2),sourceInputs=new Map();
const hash=b=>createHash('sha256').update(b).digest('hex');
const safe=s=>!s.includes('..')&&!s.startsWith('/');
async function put(p,b){const dest=path.join(out,p);await mkdir(path.dirname(dest),{recursive:true});await writeFile(dest,b);}
async function registerFiles(id,bundle){for(const item of bundle)await put('apps/'+id+'/'+item.name,item.bytes);}
await put('assets/desktop/apps.json',JSON.stringify([...sourceInputs.keys()]));
"""
        viewer=registration.viewer(baseline)
        self.assertEqual(registration.viewer(viewer),viewer)
        associations=registration.association("export function accountFileApp(path, sourceApp) {\n  return sourceApp;\n}\n")
        self.assertEqual(registration.association(associations),associations)
        with tempfile.TemporaryDirectory() as temp:
            t=Path(temp);(t/'apps').mkdir();(t/'apps/mathcraft').symlink_to(ROOT,target_is_directory=True)
            (t/'build.mjs').write_text(viewer);out=t/'out'
            subprocess.run(['node',str(t/'build.mjs'),str(t),str(out)],check=True)
            for name in json.loads((ROOT/'webos-files.json').read_text()):
                target='index.mjs' if name=='app.mjs' else name
                self.assertEqual((out/'apps/mathcraft'/target).read_bytes(),(ROOT/name).read_bytes())
            self.assertTrue((out/'assets/legal/mathcraft/source-3996ed4.tar.xz').is_file())
            (t/'route.mjs').write_text(associations+"if(accountFileApp('rotor.MATHCRAFT','text')!=='mathcraft'||accountFileApp('a.txt','text')!=='text')throw Error('Routing failed');")
            subprocess.run(['node',str(t/'route.mjs')],check=True)
if __name__=='__main__':unittest.main(verbosity=2)
