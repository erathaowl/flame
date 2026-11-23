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

# DSEG7 Classic is distributed under SIL Open Font License 1.1.
dseg_archive="$temp_dir/dseg.zip"
curl -fsSL --retry 3 \
  "https://github.com/keshikan/DSEG/releases/download/v0.46/fonts-DSEG_v046.zip" \
  -o "$dseg_archive"
for filename in DSEG7Classic-Regular.woff2 DSEG7Classic-Bold.woff2; do
  entry="$(unzip -Z1 "$dseg_archive" | grep -E "(^|/)$filename$" | head -n 1 || true)"
  if [ -z "$entry" ]; then
    echo "Font $filename was not found in the DSEG archive" >&2
    exit 1
  fi
  unzip -p "$dseg_archive" "$entry" > "$destination/$filename"
  test -s "$destination/$filename"
  echo "Installed $filename"
done
curl -fsSL --retry 3 \
  "https://raw.githubusercontent.com/keshikan/DSEG/a32644015f2c81b98bc6a80e897770780003b15e/DSEG-LICENSE.txt" \
  -o "$destination/LICENSE-DSEG.txt"

# Doto is distributed under SIL Open Font License 1.1.
doto_commit="1c587f2eed62cb257055540ac2a15f356070414f"
curl -fsSL --retry 3 \
  "https://raw.githubusercontent.com/oliverlalan/Doto/$doto_commit/fonts/webfonts/Doto%5BROND%2Cwght%5D.woff2" \
  -o "$destination/Doto.woff2"
test -s "$destination/Doto.woff2"
curl -fsSL --retry 3 \
  "https://raw.githubusercontent.com/oliverlalan/Doto/$doto_commit/OFL.txt" \
  -o "$destination/LICENSE-Doto.txt"
echo "Installed Doto.woff2"

# Matrix Mono Screen uses separated square 5x7 dots (SIL OFL 1.1).
matrix_archive="$temp_dir/matrix-sans.zip"
curl -fsSL --retry 3 \
  "https://github.com/FriedOrange/MatrixSans/releases/download/v1.811/MatrixSans-v1.811.zip" \
  -o "$matrix_archive"
matrix_file="MatrixMonoScreen-Regular.ttf"
matrix_entry="$(unzip -Z1 "$matrix_archive" | grep -E "(^|/)$matrix_file$" | head -n 1 || true)"
if [ -z "$matrix_entry" ]; then
  echo "Font $matrix_file was not found in the Matrix Sans release" >&2
  exit 1
fi
unzip -p "$matrix_archive" "$matrix_entry" > "$destination/$matrix_file"
test -s "$destination/$matrix_file"

matrix_license="$(unzip -Z1 "$matrix_archive" | grep -E '(^|/)OFL\.txt
 | head -n 1 || true)"
if [ -z "$matrix_license" ]; then
  echo "Matrix Sans license was not found in the release archive" >&2
  exit 1
fi
unzip -p "$matrix_archive" "$matrix_license" > "$destination/LICENSE-MatrixSans.txt"
test -s "$destination/LICENSE-MatrixSans.txt"
echo "Installed $matrix_file"

