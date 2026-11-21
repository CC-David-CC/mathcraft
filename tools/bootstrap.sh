#!/usr/bin/env bash
# Initialize only this checkout. Existing remotes and remote history are preserved.
set -euo pipefail
cd -- "$(dirname -- "$0")/.."
root=$(pwd -P)
[[ -f app.mjs && -f webos-files.json && -f lab/unbalance.m ]] || { echo 'Run this from the extracted MathCraft app.' >&2; exit 1; }
repo_name=''
if [[ $# -gt 0 ]]; then
  [[ $# == 2 && $1 == --publish && $2 =~ ^[A-Za-z0-9_-]+/[A-Za-z0-9._-]+$ ]] || { echo 'Usage: bash tools/bootstrap.sh [--publish OWNER/REPO]' >&2; exit 2; }
  repo_name=$2
fi
if [[ ! -e .git ]]; then git init -b main .; fi
[[ $(git rev-parse --show-toplevel) == "$root" ]] || { echo 'Expected an independent MathCraft repository.' >&2; exit 1; }
if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
  node tools/verify-vendor.mjs
  npm test
  git add -- .github .gitignore app.mjs index.html icon.svg src lab examples vendor tests tools package.json package-lock.json README.md START-HERE.md webos-files.json
  git commit -m 'Start MathCraft with a browser-native Octave rotating-unbalance lab'
else
  echo 'Using the existing MathCraft history. Further edits remain in your working tree.'
fi
[[ -n $repo_name ]] || exit 0
gh auth status --hostname github.com
branch=$(git symbolic-ref --short HEAD)
origin=$(git config --get remote.origin.url || true)
if [[ -n $origin ]]; then
  normal=${origin%.git}
  case ${normal,,} in
    "https://github.com/${repo_name,,}"|"git@github.com:${repo_name,,}"|"ssh://git@github.com/${repo_name,,}") ;;
    *) echo "origin points to $origin. Reconcile the destination before publishing." >&2; exit 1;;
  esac
fi
if ! gh repo view "$repo_name" --json nameWithOwner > /dev/null 2>&1; then
  gh repo create "$repo_name" --private --description 'A browser-native GNU Octave mathematics workbench'
fi
if [[ -z $origin ]]; then
  if [[ $(gh config get git_protocol --host github.com 2>/dev/null || true) == ssh ]]; then
    git remote add origin "$(gh repo view "$repo_name" --json sshUrl --jq .sshUrl)"
  else
    git remote add origin "$(gh repo view "$repo_name" --json url --jq .url).git"
  fi
fi
git fetch origin
if [[ -n $(git ls-remote --heads origin) ]]; then
  if ! git show-ref --verify --quiet "refs/remotes/origin/$branch" || ! git merge-base --is-ancestor "origin/$branch" HEAD; then
    echo 'The existing GitHub history needs to be integrated before this branch can be pushed.' >&2; exit 1
  fi
fi
git push --set-upstream origin "$branch"
