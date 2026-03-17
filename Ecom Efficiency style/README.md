## Higgsfield Auto Login (Playwright, Python)

This script opens `https://higgsfield.ai/auth/login`, types the provided email and password with a natural typing delay, and clicks "Log in".

### Prerequisites
- Python 3.9+

### Setup
```bash
pip install -r requirements.txt
python -m playwright install
```

### Usage
```bash
python autologin_higgsfield.py \
  --email "bukeepyndxx@hotmail.com" \
  --password "Heygen@1006"
```

Flags:
- `--headless` to run without opening a browser window

You can also set environment variables instead of flags:
```bash
set HIGGSFIELD_EMAIL=bukeepyndxx@hotmail.com
set HIGGSFIELD_PASSWORD=Heygen@1006
python autologin_higgsfield.py
```

Typing delay is set to 80ms per character for both fields.

