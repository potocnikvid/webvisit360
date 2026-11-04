"""Pull the Webvisit360 account's 360 photos from the Street View Publish API.

One-time sign-in uses an OAuth "Desktop app" client with a loopback redirect:
the browser ends on http://localhost/?code=... (the page fails to load, which is
expected) and you copy that whole address back into the terminal / chat.

  python3 google_streetview.py auth-url              # prints the sign-in link
  python3 google_streetview.py exchange '<url|code>' # stores the refresh token
  python3 google_streetview.py fetch                 # writes raw/google_streetview.json

Client credentials come from env GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.
The token is kept OUTSIDE the repo (env GSV_TOKEN_FILE, default ~/.webvisit360-gsv-token.json).
"""
import json, os, sys, urllib.parse, urllib.request
from pathlib import Path

SCOPE = "https://www.googleapis.com/auth/streetviewpublish"
REDIRECT = "http://localhost"
TOKEN_FILE = Path(os.environ.get("GSV_TOKEN_FILE", Path.home() / ".webvisit360-gsv-token.json"))
OUT = Path(__file__).resolve().parent.parent / "raw" / "google_streetview.json"


def client():
    try:
        return os.environ["GOOGLE_CLIENT_ID"], os.environ["GOOGLE_CLIENT_SECRET"]
    except KeyError:
        sys.exit("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET")


def post(url, data):
    req = urllib.request.Request(url, data=urllib.parse.urlencode(data).encode())
    try:
        return json.load(urllib.request.urlopen(req))
    except urllib.error.HTTPError as e:
        sys.exit(f"{e.code} {e.read().decode()}")


def auth_url():
    cid, _ = client()
    q = dict(client_id=cid, redirect_uri=REDIRECT, response_type="code", scope=SCOPE,
             access_type="offline", prompt="consent")
    print("https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(q))


def exchange(arg):
    code = urllib.parse.parse_qs(urllib.parse.urlparse(arg).query).get("code", [arg])[0]
    cid, sec = client()
    tok = post("https://oauth2.googleapis.com/token", dict(
        code=code, client_id=cid, client_secret=sec, redirect_uri=REDIRECT, grant_type="authorization_code"))
    if "refresh_token" not in tok:
        sys.exit(f"No refresh token returned: {tok}")
    TOKEN_FILE.write_text(json.dumps({"refresh_token": tok["refresh_token"]}))
    TOKEN_FILE.chmod(0o600)
    print("Signed in; token saved to", TOKEN_FILE)


def access_token():
    cid, sec = client()
    rt = json.loads(TOKEN_FILE.read_text())["refresh_token"]
    return post("https://oauth2.googleapis.com/token", dict(
        refresh_token=rt, client_id=cid, client_secret=sec, grant_type="refresh_token"))["access_token"]


def fetch():
    at = access_token()
    photos, page = [], None
    while True:
        q = {"view": "BASIC", "pageSize": 100, "languageCode": "sl"}
        if page:
            q["pageToken"] = page
        req = urllib.request.Request(
            "https://streetviewpublish.googleapis.com/v1/photos?" + urllib.parse.urlencode(q),
            headers={"Authorization": f"Bearer {at}"})
        try:
            r = json.load(urllib.request.urlopen(req))
        except urllib.error.HTTPError as e:
            sys.exit(f"{e.code} {e.read().decode()}")
        photos += r.get("photos", [])
        print(f"\r{len(photos)} photos", end="", flush=True)
        page = r.get("nextPageToken")
        if not page:
            break
    print()
    OUT.write_text(json.dumps(photos, ensure_ascii=False, indent=1))
    print("wrote", OUT)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "auth-url":
        auth_url()
    elif cmd == "exchange" and len(sys.argv) > 2:
        exchange(sys.argv[2])
    elif cmd == "fetch":
        fetch()
    else:
        sys.exit(__doc__)
