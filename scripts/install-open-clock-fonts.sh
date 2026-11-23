#!/bin/sh
set -eu

destination="${1:-client/public/clock-fonts}"
mkdir -p "$destination"

temp_dir="$(mktemp -d)"
trap 'rm -rf "$temp_dir"' EXIT

for font in JetBrainsMono 3270; do
  case "$font" in
    JetBrainsMono) filename="JetBrainsMonoNerdFontMono-Regular.ttf" ;;
    3270) filename="3270NerdFontMono-Regular.ttf" ;;
  esac

  archive="$temp_dir/$font.tar.xz"
  curl -fsSL --retry 3 \
    "https://github.com/ryanoasis/nerd-fonts/releases/download/v3.5.1/$font.tar.xz" \
    -o "$archive"

  entry="$(tar -tJf "$archive" | grep -E "(^|/)$filename$" | head -n 1)"
  if [ -z "$entry" ]; then
    echo "Font $filename was not found in the release archive" >&2
    exit 1
  fi

  tar -xJOf "$archive" "$entry" > "$destination/$filename"
  echo "Installed $filename"

  license="$(tar -tJf "$archive" | grep -Ei '(^|/)LICEN[CS]E(\.(txt|md))?$' | head -n 1 || true)"
  if [ -n "$license" ]; then
    tar -xJOf "$archive" "$license" > "$destination/LICENSE-$font.txt"
  fi
done
