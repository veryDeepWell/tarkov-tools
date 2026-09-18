# P4 push

```bash
cd tarkov-tools && git checkout main && git pull
find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -a /path/to/P4/repo/. .
git add -A
git commit -m "P4: core/ hub/ tools/ structure"
git push origin main
```

Root: docs + catalog.json + index.html + tarkovtool-hub.html + core/ hub/ tools/ locales/ assets/
