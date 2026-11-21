# GNU Octave for MathCraft

The browser build contains GNU Octave 7.2.0. The unmodified browser binaries octave.js, octave.wasm and octave.data come from the published package @liudonghua123/octave-wasm 0.0.1. Its npm integrity is sha512-PQuMAvdUM+/tHp6zL54VkyujJOV5VSJBirWlm754/50862BCO5+/Mys/CiJvesgW0yEG5KWlldB6tyMRjM8/yg==. [Published package](https://www.npmjs.com/package/@liudonghua123/octave-wasm)

The archive source-3996ed4.tar.xz carries the matching upstream source at commit 3996ed46c0c9c44310e5aa9b3c2dc5ac1fd8ff0f. It contains the patched Octave 7.2.0 source, build scripts, numerical libraries, tool wrappers and their notices. The archived tree omits the obsolete third_party/octave-4.4.1 directory. The upstream Dockerfile selects version 7.2.0 and Emscripten 3.1.24. An unmodified copy of Octave's scripts/testfun/assert.m supplements the binary package's preloaded script set. [Pinned source tree](https://github.com/liudonghua123/octave-wasm/tree/3996ed46c0c9c44310e5aa9b3c2dc5ac1fd8ff0f)

To build from source in a separate directory, extract the tar.xz, enter octave-wasm-3996ed4, and run make dist with Docker and make installed. That upstream command builds its container and copies browser assets to dist. The supplied release uses the published binary artifacts. Local checksum verification is available with npm run verify:vendor from the app root.

GNU-GPL-3.txt contains the GNU GPL v3 text. GNU Octave and its script headers specify their terms. WASM-wrapper.LICENSE is the BSD-3-Clause wrapper notice. The bundled dependencies retain their licenses in the corresponding source archive. New project sources have no separately selected publication license in this starter.
