// electron-builder afterPack hook (Linux only): wrap the app binary in a script that adds the flags
// main.cjs needs, so they apply however the app is opened (double-clicking the AppImage, menu entry, CLI).
const fs = require('node:fs')
const path = require('node:path')

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'linux') return
  const name = context.packager.executableName
  const bin = path.join(context.appOutDir, name)
  fs.renameSync(bin, `${bin}.bin`)
  fs.writeFileSync(
    bin,
    `#!/bin/sh\nexec "$(dirname "$(readlink -f "$0")")/${name}.bin" --ozone-platform=x11 --no-sandbox "$@"\n`,
    { mode: 0o755 },
  )
}
