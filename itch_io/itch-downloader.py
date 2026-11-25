import configparser
import json
import os
import sys
import tempfile
import time
import urllib.parse
from http.cookiejar import MozillaCookieJar

import requests
import requests.cookies
from bs4 import BeautifulSoup

import dltool

version = "0.5.3-all-assets"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def resolve_path(path_value):
    if os.path.isabs(path_value):
        return path_value
    return os.path.join(BASE_DIR, path_value)


def load_cookies_into_session(session, cookie_file_path):
    """
    Load itch.io cookies from cookie_file_path.
    Supports:
      1. Netscape cookies.txt format (standard MozillaCookieJar)
      2. Netscape format missing the '# Netscape HTTP Cookie File' magic header
      3. JSON array of cookie objects (e.g. exported by Cookie-Editor / EditThisCookie)
      4. Raw 'Cookie:' header string (e.g. 'itchio=...; itchio_token=...')
    """
    if not os.path.isfile(cookie_file_path):
        return False

    with open(cookie_file_path, "r", encoding="utf-8", errors="ignore") as f:
        raw_content = f.read().strip()

    if not raw_content:
        return False

    cookiejar = requests.cookies.RequestsCookieJar()

    # Case 1: JSON format
    if raw_content.startswith("[") or raw_content.startswith("{"):
        try:
            data = json.loads(raw_content)
            if isinstance(data, dict) and "cookies" in data:
                data = data["cookies"]
            if isinstance(data, list):
                for c in data:
                    if isinstance(c, dict) and "name" in c and "value" in c:
                        cookiejar.set(
                            c["name"],
                            c["value"],
                            domain=c.get("domain", ".itch.io"),
                            path=c.get("path", "/"),
                        )
                session.cookies.update(cookiejar)
                return len(session.cookies) > 0
        except Exception:
            pass

    # Case 2: Netscape format (with or without header)
    if "\t" in raw_content:
        try:
            if not raw_content.startswith("# Netscape HTTP Cookie File") and not raw_content.startswith("# HTTP Cookie File"):
                with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False) as tf:
                    tf.write("# Netscape HTTP Cookie File\n" + raw_content + "\n")
                    temp_path = tf.name
                try:
                    moz = MozillaCookieJar(temp_path)
                    moz.load(ignore_expires=True, ignore_discard=True)
                    cookiejar.update(moz)
                finally:
                    if os.path.exists(temp_path):
                        os.remove(temp_path)
            else:
                moz = MozillaCookieJar(cookie_file_path)
                moz.load(ignore_expires=True, ignore_discard=True)
                cookiejar.update(moz)
            session.cookies.update(cookiejar)
            return len(session.cookies) > 0
        except Exception:
            pass

    # Case 3: Raw cookie string (e.g. "itchio=...; itchio_token=...")
    lines = [
        line.strip()
        for line in raw_content.splitlines()
        if line.strip() and not line.strip().startswith("#")
    ]
    if lines:
        raw_line = "; ".join(lines)
        if raw_line.lower().startswith("cookie:"):
            raw_line = raw_line.split(":", 1)[1].strip()
        if "=" in raw_line:
            for part in raw_line.split(";"):
                if "=" in part:
                    k, v = part.strip().split("=", 1)
                    cookiejar.set(k.strip(), v.strip(), domain=".itch.io", path="/")
        else:
            # Single token value assumed to be 'itchio' session cookie
            cookiejar.set("itchio", raw_line.strip(), domain=".itch.io", path="/")
        session.cookies.update(cookiejar)
        return len(session.cookies) > 0

    return False


def extract_csrf_token(soup):
    meta = soup.find("meta", attrs={"name": "csrf_token"})
    if meta:
        return meta.get("value") or meta.get("content") or ""
    inp = soup.find("input", attrs={"name": "csrf_token"})
    if inp:
        return inp.get("value") or ""
    return ""


def fetch_upload(uploads_soup, dlurl, session, params, csfrtoken, gamedirectory, download_dir):
    link_el = uploads_soup.find("a", attrs={"data-upload_id": True}) or uploads_soup.find("a")
    if not link_el or not link_el.get("data-upload_id"):
        return

    downloadid = link_el["data-upload_id"]
    name_el = uploads_soup.find(class_="name")
    fallback_name = name_el.get_text(strip=True) if name_el else f"upload_{downloadid}"

    dlurl_final = dlurl.rstrip("/") + "/file/" + str(downloadid)
    post_data = {"csrf_token": csfrtoken} if csfrtoken else {}

    try:
        resp = session.post(dlurl_final, params=params, data=post_data, timeout=30)
        dlj = resp.json()
    except Exception as e:
        print(f"*** Failed to request download URL for upload {downloadid} ({fallback_name}): {e}")
        return

    if not isinstance(dlj, dict) or "url" not in dlj:
        print(f"*** No download URL returned for {fallback_name}: {dlj}")
        return

    file_url = dlj["url"]
    parsed_url = urllib.parse.urlparse(file_url)
    dldomain = parsed_url.netloc.lower()

    if dldomain in ("drive.google.com", "docs.google.com", "www.dropbox.com", "dropbox.com", "mega.nz"):
        print(f"******** External download host ({dldomain}) is UNSUPPORTED: {file_url}")
        return

    fulldldir = download_dir
    os.makedirs(fulldldir, exist_ok=True)

    dltool.download_a_file(
        file_url,
        target_dir=fulldldir,
        fallback_name=fallback_name,
        add_date_suffix=True,
        session=session,
    )


def collect_items_from_cells(soup, seen_urls, item_list):
    cells = soup.find_all("div", class_="game_cell_data")
    for game in cells:
        title_el = game.find("a", class_="title") or game.find("a", class_="game_link")
        btn_el = game.find("a", class_="button") or title_el
        if not btn_el or not btn_el.get("href"):
            continue

        gtitle = title_el.get_text(strip=True) if title_el else btn_el.get_text(strip=True)
        gurl = urllib.parse.urljoin("https://itch.io", btn_el["href"])

        if gurl not in seen_urls:
            seen_urls.add(gurl)
            platform_soup = game.find("div", class_="game_platform")
            is_game = bool(platform_soup)
            item_list.append(
                {
                    "title": gtitle,
                    "dlurl": gurl,
                    "is_game": is_game,
                }
            )


def collect_my_purchases(session, seen_urls, item_list):
    print("*** Loading and parsing claimed purchases (/my-purchases) ***")
    mypurchases_url = "https://itch.io/my-purchases"
    pagecounter = 1

    r = session.get(mypurchases_url, timeout=30)
    if r.status_code != 200:
        print(f"Could not access {mypurchases_url} properly [{r.status_code}].")
        return False

    if r.url != mypurchases_url and "login" in r.url:
        print("Not properly authenticated! Please provide valid itch.io cookies in cookies-itch.txt.")
        return False

    soup = BeautifulSoup(r.text, "html.parser")
    collect_items_from_cells(soup, seen_urls, item_list)

    soup_nextpage = soup.find("div", attrs={"class": "next_page forward_link"}) or soup.find("a", class_="next_page")
    while soup_nextpage:
        pagecounter += 1
        print(".", flush=True, end="")
        r = session.get(f"{mypurchases_url}?page={pagecounter}", timeout=30)
        if r.status_code != 200:
            print(f" [{pagecounter}]", flush=True)
            break
        soup = BeautifulSoup(r.text, "html.parser")
        before_count = len(item_list)
        collect_items_from_cells(soup, seen_urls, item_list)
        if len(item_list) == before_count:
            break
        soup_nextpage = soup.find("div", attrs={"class": "next_page forward_link"}) or soup.find("a", class_="next_page")

    print("")
    return True


def collect_my_bundles(session, seen_urls, item_list):
    bundles_url = "https://itch.io/my-purchases/bundles"
    r = session.get(bundles_url, timeout=30)
    if r.status_code != 200 or "login" in r.url:
        return

    soup = BeautifulSoup(r.text, "html.parser")
    bundle_links = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if "/bundle/download/" in href:
            full_bundle_url = urllib.parse.urljoin("https://itch.io", href)
            if full_bundle_url not in bundle_links:
                bundle_links.append(full_bundle_url)

    if not bundle_links:
        return

    print(f"*** Found {len(bundle_links)} bundle(s) in /my-purchases/bundles, scanning bundle items ***")
    for b_url in bundle_links:
        page = 1
        while True:
            sep = "&" if "?" in b_url else "?"
            page_url = b_url if page == 1 else f"{b_url}{sep}page={page}"
            br = session.get(page_url, timeout=30)
            if br.status_code != 200:
                break
            bsoup = BeautifulSoup(br.text, "html.parser")
            rows = bsoup.find_all("div", class_="game_row_data") or bsoup.find_all("div", class_="game_cell_data")
            if not rows:
                break
            found_on_page = 0
            for row in rows:
                title_el = row.find("h2", class_="game_title") or row.find("a", class_="title")
                dl_btn = row.find("a", class_="game_download_btn") or row.find("a", class_="button")
                if dl_btn and dl_btn.get("href"):
                    gurl = urllib.parse.urljoin("https://itch.io", dl_btn["href"])
                    gtitle = title_el.get_text(strip=True) if title_el else dl_btn.get_text(strip=True)
                    if gurl not in seen_urls:
                        seen_urls.add(gurl)
                        item_list.append({"title": gtitle, "dlurl": gurl, "is_game": True})
                        found_on_page += 1
            next_el = bsoup.find("a", class_="next_page") or bsoup.find("div", class_="next_page")
            if not next_el or found_on_page == 0:
                break
            page += 1


def collect_my_collections(session, seen_urls, item_list):
    collections_url = "https://itch.io/my-collections"
    r = session.get(collections_url, timeout=30)
    if r.status_code != 200 or "login" in r.url:
        return

    soup = BeautifulSoup(r.text, "html.parser")
    collection_links = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if href.startswith("/c/") and "/" in href[3:]:
            full_c_url = urllib.parse.urljoin("https://itch.io", href)
            if full_c_url not in collection_links:
                collection_links.append(full_c_url)

    if not collection_links:
        return

    print(f"*** Found {len(collection_links)} collection(s) in /my-collections, scanning items ***")
    for c_url in collection_links:
        cr = session.get(c_url, timeout=30)
        if cr.status_code == 200:
            csoup = BeautifulSoup(cr.text, "html.parser")
            collect_items_from_cells(csoup, seen_urls, item_list)


def download_item(g, session, download_dir, config):
    raw_url = g["dlurl"]
    r = session.get(raw_url, timeout=30)
    if r.status_code != 200:
        print(f"Could not access page {raw_url} (HTTP {r.status_code})!")
        return

    dlpage_soup = BeautifulSoup(r.text, "html.parser")

    # Determine base game URL, game directory slug, and download key (if any)
    parsed = urllib.parse.urlparse(r.url)
    path_parts = [p for p in parsed.path.split("/") if p]

    # Typical purchase download URL: https://author.itch.io/<slug>/download/<key>
    if len(path_parts) >= 3 and path_parts[1] == "download":
        gamedirectory = path_parts[0]
        dlurl = f"{parsed.scheme}://{parsed.netloc}/{gamedirectory}"
        paramPost = {"source": "game_download", "key": path_parts[2]}
    elif len(path_parts) >= 1:
        gamedirectory = path_parts[0]
        dlurl = f"{parsed.scheme}://{parsed.netloc}/{gamedirectory}"
        # Check query string for key
        qs = urllib.parse.parse_qs(parsed.query)
        if "key" in qs:
            paramPost = {"source": "game_download", "key": qs["key"][0]}
        else:
            paramPost = {"source": "view_game"}
    else:
        print(f"Could not determine game slug from URL: {r.url}")
        return

    csfrToken = extract_csrf_token(dlpage_soup)
    upload_widget = dlpage_soup.find("div", class_="upload_list_widget")
    uploads = upload_widget.find_all(class_="upload") if upload_widget else []

    # If this was a public game/asset page without direct upload buttons visible,
    # try requesting /download_url to get the temporary download page for free items.
    if not uploads and "download" not in path_parts:
        try:
            dl_endpoint = f"{dlurl}/download_url"
            resp = session.post(dl_endpoint, data={"csrf_token": csfrToken}, timeout=30)
            if resp.status_code == 200:
                dl_json = resp.json()
                if "url" in dl_json:
                    r2 = session.get(dl_json["url"], timeout=30)
                    if r2.status_code == 200:
                        dlpage_soup = BeautifulSoup(r2.text, "html.parser")
                        csfrToken = extract_csrf_token(dlpage_soup) or csfrToken
                        upload_widget = dlpage_soup.find("div", class_="upload_list_widget")
                        uploads = upload_widget.find_all(class_="upload") if upload_widget else []
                        parsed2 = urllib.parse.urlparse(r2.url)
                        parts2 = [p for p in parsed2.path.split("/") if p]
                        if len(parts2) >= 3 and parts2[1] == "download":
                            paramPost = {"source": "game_download", "key": parts2[2]}
        except Exception:
            pass

    if not uploads:
        print(f"No downloadable files found on {r.url}")
        return

    for u in uploads:
        fetch_upload(u, dlurl, session, paramPost, csfrToken, gamedirectory, download_dir)

    fulldldir = download_dir

    # Optional: fetch screenshot of game page
    if config.getboolean("SCREENSHOT", "dump_webpage", fallback=False):
        service_url = config.get("SCREENSHOT", "screenshot_service", fallback="")
        if service_url.startswith("http"):
            print(f"Making screenshot of {dlurl}.")
            picturedata = requests.get(service_url.format(dlurl), timeout=30)
            if picturedata.status_code == 200:
                os.makedirs(fulldldir, exist_ok=True)
                with open(os.path.join(fulldldir, "screenshot_website.jpg"), "wb") as f:
                    f.write(picturedata.content)

    # Optional: fetch screenshot(s)
    if config.getboolean("SCREENSHOT", "dump_screenshots", fallback=False):
        gamepage = session.get(dlurl, timeout=30)
        if gamepage.status_code == 200:
            gamepage_soup = BeautifulSoup(gamepage.text, "html.parser")
            screenshots_soup = gamepage_soup.find_all("img", class_="screenshot")
            if screenshots_soup:
                print(f"Downloading {len(screenshots_soup)} screenshots.")
                os.makedirs(fulldldir, exist_ok=True)
                for c, ss in enumerate(screenshots_soup, start=1):
                    if ss.parent and ss.parent.get("href"):
                        screenshot = session.get(ss.parent["href"], timeout=30)
                        if screenshot.status_code == 200:
                            with open(os.path.join(fulldldir, "screenshot_%02d.jpg" % c), "wb") as f:
                                f.write(screenshot.content)


def main(config):
    raw_dl_dir = (
        config["DEFAULT"].get("download_directory")
        or config["DEFAULT"].get("download directory")
        or "downloaded_assets"
    )
    raw_cookie_file = (
        config["DEFAULT"].get("cookie_file")
        or config["DEFAULT"].get("cookie file")
        or "cookies-itch.txt"
    )

    download_dir = resolve_path(raw_dl_dir)
    cookie_file = resolve_path(raw_cookie_file)

    os.makedirs(download_dir, exist_ok=True)
    print(f"Download directory is '{download_dir}'.")

    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
            )
        }
    )

    if not load_cookies_into_session(session, cookie_file):
        print(f"*** Cookie file not found or empty at: {cookie_file}")
        print("*** Please export your itch.io browser cookies to 'itch_io/cookies-itch.txt' and re-run.")
        sys.exit(1)

    seen_urls = set()
    all_items = []

    if not collect_my_purchases(session, seen_urls, all_items):
        sys.exit(1)

    collect_my_bundles(session, seen_urls, all_items)
    collect_my_collections(session, seen_urls, all_items)

    games_count = sum(1 for item in all_items if item.get("is_game"))
    assets_count = len(all_items) - games_count
    print(
        f"{len(all_items)} items found in total: {games_count} games, {assets_count} non-game assets/items."
    )

    if not all_items:
        print("No items found in your itch.io account.")
        return

    trackfile = os.path.join(download_dir, ".itch-downloader-track.txt")
    trackNum = 0
    if os.path.exists(trackfile):
        try:
            with open(trackfile, "r", encoding="utf-8") as f:
                trackNum = json.loads(f.read())
            os.remove(trackfile)
        except Exception:
            trackNum = 0

    numItems = len(all_items)
    for curIdx, item in enumerate(all_items, start=1):
        if curIdx >= trackNum:
            print("")
            print(f" -- [{curIdx}/{numItems}] {item['title']}")

            with open(trackfile, "w", encoding="utf-8") as f:
                json.dump(curIdx, f)

            download_item(item, session, download_dir, config)

    if os.path.exists(trackfile):
        os.remove(trackfile)


if __name__ == "__main__":
    print(f"itch-downloader.py {version} (based on shakeyourbunny/itch-downloader)")
    print("")

    config = configparser.ConfigParser()
    configfile = resolve_path("itch-downloader.ini")

    config["DEFAULT"] = {
        "download_directory": "downloaded_assets",
        "cookie_file": "cookies-itch.txt",
    }
    config["OPSYS"] = {
        "windows": "True",
        "linux": "True",
        "macos": "True",
        "android": "True",
    }
    config["SCREENSHOT"] = {
        "screenshot_service": "",
        "cmd_videodownloader": "yt-dlp",
        "dump_webpage": "False",
        "dump_screenshots": "False",
        "dump_videos": "False",
    }

    if not os.path.isfile(configfile):
        with open(configfile, "w", encoding="utf-8") as f:
            config.write(f)
        print(f"*** Created new configuration at '{configfile}'.")

    config.read(configfile)
    main(config)

    print("")
    print("Done.")
