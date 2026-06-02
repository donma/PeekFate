#!/usr/bin/env python3
"""Generate solar terms data for 1900-2100 using astronomical algorithm."""
import math
import json
import os

SOLAR_TERM_NAMES = [
    '\u5c0f\u5bd2', '\u5927\u5bd2', '\u7acb\u6625', '\u96e8\u6c34',
    '\u9a5a\u86c7', '\u6625\u5206', '\u6e05\u660e', '\u7a40\u96e8',
    '\u7acb\u590f', '\u5c0f\u6eff', '\u8292\u79cd', '\u590f\u81f3',
    '\u5c0f\u6691', '\u5927\u6691', '\u7acb\u79cb', '\u8655\u6691',
    '\u767d\u9732', '\u79cb\u5206', '\u5bd2\u9732', '\u971c\u964d',
    '\u7acb\u51ac', '\u5c0f\u96ea', '\u5927\u96ea', '\u51ac\u81f3'
]

def jd_to_date(jd, tz_offset=8):
    """Convert Julian Day to (year, month, day) at given timezone offset (hours)."""
    jd_local = jd + tz_offset / 24.0  # convert to local time (Beijing = UTC+8)
    jd_local = jd_local + 0.5
    Z = int(jd_local)
    A = Z if Z < 2299161 else Z + 1 + (Z - 1867216.25) / 36524.25 // 1 - (Z - 1867216.25) / 36524.25 // 4
    B = A + 1524
    C = (B - 122.1) / 365.25 // 1
    D = (C * 365.25) // 1
    E = ((B - D) / 30.6001) // 1
    day = B - D - (E * 30.6001) // 1
    month = E - 1 if E < 14 else E - 13
    year = C - 4716 if month > 2 else C - 4715
    return int(year), int(month), int(day)

def sun_longitude(jd):
    """Calculate sun's apparent ecliptic longitude at given JD."""
    T = (jd - 2451545.0) / 36525.0
    L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T
    M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T
    C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * math.sin(math.radians(M))
    C += (0.019993 - 0.000101 * T) * math.sin(math.radians(2 * M))
    C += 0.000289 * math.sin(math.radians(3 * M))
    return (L0 + C) % 360.0

def find_solar_term(year, idx):
    """Find the date (YYYY-MM-DD) when sun reaches target longitude for term idx."""
    target_lon = (285 + idx * 15) % 360  # idx 0=小寒(285°), idx 23=冬至(270°)
    # Approximate JD for Jan 0 of the year
    jan0_jd = 1721423.5 + (year - 1) * 365.2425
    # Rough offset: idx * 15.218 days + ~3.5 days into Jan
    jd = jan0_jd + 3.0 + idx * 15.218
    # Iterate to find exact crossing
    for _ in range(8):
        lon = sun_longitude(jd)
        diff = (target_lon - lon + 180) % 360 - 180
        if abs(diff) < 1e-6:
            break
        jd += diff * 365.25 / 360.0
    y, m, d = jd_to_date(jd)
    return f"{y:04d}-{m:02d}-{d:02d}"

def main():
    data = {}
    for year in range(1900, 2101):
        year_data = {}
        for idx, name in enumerate(SOLAR_TERM_NAMES):
            year_data[name] = find_solar_term(year, idx)
        data[str(year)] = year_data
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(script_dir, '..', 'data', 'core', 'solar-terms.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Generated solar terms for {len(data)} years (1900-2100)")
    print(f"Output: {output_path}")

if __name__ == '__main__':
    main()
