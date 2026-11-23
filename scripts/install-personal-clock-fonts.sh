#!/bin/sh
set -eu

destination="${1:?Usage: sh scripts/install-personal-clock-fonts.sh DATA_DIR/clock-fonts}"
mkdir -p "$destination"
temp_dir="$(mktemp -d)"
trap 'rm -rf "$temp_dir"' EXIT

for name in lcddot cf_lcd_521 modern_lcd_7 advanced_pixel_lcd_7 lcd_at_t_phone_time_date; do
  case "$name" in
    lcddot) filename="lcddot_tr.ttf" ;;
    cf_lcd_521) filename="CF LCD 521.ttf" ;;
    modern_lcd_7) filename="modern_lcd-7.ttf" ;;
    advanced_pixel_lcd_7) filename="advanced_pixel_lcd-7.ttf" ;;
    lcd_at_t_phone_time_date) filename="LCDAT&TPhoneTimeDate.ttf" ;;
  esac

  archive="$temp_dir/$name.zip"
  curl -fsSL --retry 3 "https://dl.dafont.com/dl/?f=$name" -o "$archive"
  entry="$(unzip -Z1 "$archive" | grep -Ei '\.(ttf|otf)$' | head -n 1 || true)"
  if [ -z "$entry" ]; then
    echo "No font file was found in $name" >&2
    exit 1
  fi
  unzip -p "$archive" "$entry" > "$destination/$filename"
  echo "Installed $filename"
done
