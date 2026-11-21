# Start MathCraft on this machine

## Give this task to local Codex

> Install this MathCraft checkout as the independent app at apps/mathcraft in my WebOS assembly. Create or reuse my GitHub repository CC-David-CC/mathcraft and push the app. Use private visibility for a newly created repo. Read the real checkout's build and contribution instructions. Use this implementation as your starting point and iterate until the rotating-unbalance lab passes the standalone and live WebOS checks below. Preserve existing work, report exact results and distinguish simulated measurements from mine.

## Establish ownership and publish

1. Locate the actual assembly and desktop repos. Check their status, existing app layout, how app revisions are pinned and whether `apps/mathcraft` or the GitHub repo already exists. Use the user's authenticated Git and GitHub CLI identities. If a repo exists with commits, start from its history and integrate the supplied files as a reviewed change.
2. For a new app, extract the ZIP's single `mathcraft/` directory to `apps/mathcraft`. The directory containing `app.mjs` is the repository root. If the assembly already manages submodules or checkouts through a manifest, use that mechanism for the parent pointer. Keep app history in its own repo.
3. In the app directory run `bash tools/bootstrap.sh --publish CC-David-CC/mathcraft`. This checks the vendor bytes and unit tests before making the first commit, creates a new private GitHub repo when needed and pushes without forcing. A pre-existing checkout retains its history and working edits. For a repo with an existing HEAD, commit the reviewed app changes before running the publish step. Local-only initialization is available with `bash tools/bootstrap.sh`. Verify the branch and remote SHA with `git rev-parse HEAD` and `git ls-remote origin "refs/heads/$(git branch --show-current)"`. Keep unrelated changes out of the app commit. If an account or permission blocks publishing, finish the local work and report the exact pending operation.
4. Run the README's browser checks, then build and launch the **actual desktop** with the parent repository's normal workflow. The new GitHub workflow can run the same standalone checks after push. Parent assembly and desktop changes belong to their owning repos. Keep them local unless the user has also authorized publishing those repos.

## Register MathCraft with WebOS

From the app root, `python3 tools/register-webos.py /path/to/KSU.CODES` prints the proposed diff for the known desktop layout. Review it, then add `--apply`. The script checks all anchors before writing, preserves existing programming entries including DRAKON when present, and can be rerun. If the checkout has moved, implement the same registrations in its current owners.

- App ID `mathcraft`, display name **MathCraft**, Programming menu. Register the icon, enabled-profile visibility, window title, saved layout and document lifecycle with the desktop.
- Route `.mathcraft` to this app in the parent account-file association. Both launching from Files and opening a worksheet inside the app must work.
- The viewer packages `webos-files.json` from `apps/mathcraft`, renaming only `app.mjs` to the viewer's `index.mjs`. Keep the relative paths for all nested modules, workers, WASM, Octave data and lab sources. Serve JavaScript as JavaScript and `.wasm` as `application/wasm`. The registration copies the matching Octave source and notices to `assets/legal/mathcraft/` outside the app startup inventory.
- The source entry returns `{element, dispose, ready, lifecycle, requestClose}` synchronously. Each call gets an independent worker. The app uses the account contract of the supplied DRAKON apps, including `storage.accountFileContext()`, `pickAccountFile`, SHA-256 expected revisions, `w.launchContext` and `desktop.updateAccountFileBinding`. Preserve the checkout's authenticated file service.

## Finish the lab in the real desktop

1. Open MathCraft from Programming. Verify 954.93 rpm and 10 mm for the default rig. Pin, change damping from 5% to 10%, observe 5 mm, and inspect amplitude, phase and residual plots. Change an expression in the Octave editor and establish that the plotted result changes. Restore the original model.
2. Import the sample CSV, fit damping and check approximately 7.998% and 0.02313 mm RMSE. Export residuals and compare at least one row at its original speed. Import the user's actual measurements and use the course apparatus constants when available. Preserve original units, files and calibration. A missing handout or bench file only blocks the course-specific comparison.
3. Save the edited worksheet to account Files, close the window and reopen from Files. Sign in with the same test account in a fresh browser profile, open the server-backed file, confirm source, measurements, damping and pinned run, then replay the baseline. Verify a stale revision cannot silently overwrite newer work. Close and reopen two windows independently.
4. Make and verify necessary fixes. Repeat the standalone suite after edits, rebuild the viewer, and rerun the relevant live checks. Commit and push the final app revision and update the parent pin as appropriate. Report the repo URL, commit, live build command, numerical checks, account round trip, and any task that remains blocked by missing credentials, apparatus inputs or hardware.

The package includes its own runtime, code, worked worksheet, tests and independent-repo tools. The two-window fixture supplies repeatable contract coverage while iterating locally. The fresh-profile account check exercises the user's real server.
