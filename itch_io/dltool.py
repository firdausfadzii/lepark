# download pretty a file

import os
import re
import shutil
import time
import urllib.parse
from email.utils import parsedate_to_datetime

import dateparser
import requests


def parse_http_date(date_str):
    if not date_str:
        return None
    try:
        dt = parsedate_to_datetime(date_str)
        if dt is not None:
            return dt
    except Exception:
        pass
    try:
        return dateparser.parse(date_str)
    except Exception:
        return None


def extract_filename_from_headers(headers, fallback_url="", fallback_name=""):
    cd = headers.get("content-disposition", "")
    if cd:
        # RFC 5987 filename*=UTF-8''...
        m_star = re.search(r"filename\*\s*=\s*([^']*)''([^;\s]+)", cd, re.IGNORECASE)
        if m_star:
            return urllib.parse.unquote(m_star.group(2))
        # filename="..."
        m_quoted = re.search(r'filename\s*=\s*"([^"]+)"', cd, re.IGNORECASE)
        if m_quoted:
            return m_quoted.group(1)
        # filename=...
        m_plain = re.search(r"filename\s*=\s*([^;\s]+)", cd, re.IGNORECASE)
        if m_plain:
            return m_plain.group(1).strip("'\"")

    if fallback_url:
        path_part = urllib.parse.urlparse(fallback_url).path
        base = os.path.basename(urllib.parse.unquote(path_part))
        if base:
            return base

    return fallback_name or "download.bin"


# Print iterations progress
def printProgressBar(iteration, total, prefix='', suffix='', usepercent=True, decimals=1, fill='█'):
    """
    Call in a loop to create terminal progress bar
    """
    if total <= 0:
        print(f"\r{prefix} {suffix}", end='', flush=True)
        return

    twx, _ = shutil.get_terminal_size(fallback=(80, 24))
    length = max(10, twx - 1 - len(prefix) - len(suffix) - 4 - (6 if usepercent else 0))
    filledLength = max(0, min(length, int(length * iteration // total)))
    bar = fill * filledLength + '-' * (length - filledLength)

    if usepercent:
        percent = ("{0:." + str(decimals) + "f}").format(100 * (iteration / float(total)))
        print('\r%s |%s| %s%% %s' % (prefix, bar, percent, suffix), end='', flush=True)
    else:
        print('\r%s |%s| %s' % (prefix, bar, suffix), end='', flush=True)

    if iteration >= total:
        print(flush=True)


def download_a_file(
    url,
    filename="",
    target_dir="",
    fallback_name="",
    add_date_suffix=True,
    session=None,
    cookies=None,
    rename_old=True,
    skip_if_identical=True,
):
    if session is None:
        session = requests.Session()

    # Use a plain request or session GET with stream=True so presigned R2 GET URLs work reliably
    with requests.get(url, stream=True, timeout=60) as downloaddata:
        if downloaddata.status_code != 200:
            # Fallback to authenticated session in case cookies are required on the host
            downloaddata.close()
            downloaddata = session.get(url, stream=True, cookies=cookies, timeout=60)

        if downloaddata.status_code != 200:
            print(f"*** Failed to download {url} (HTTP {downloaddata.status_code})")
            return False

        dltime = downloaddata.headers.get("last-modified")
        parsed_dt = parse_http_date(dltime)
        datalength = int(downloaddata.headers.get("content-length", 0) or 0)

        if not filename:
            raw_name = extract_filename_from_headers(downloaddata.headers, url, fallback_name)
            # Sanitize filename
            raw_name = raw_name.replace("/", "_").replace("\\", "_")
            if add_date_suffix and parsed_dt is not None and "." in raw_name:
                base, suf = raw_name.rsplit(".", 1)
                date_tag = parsed_dt.strftime("%Y%m%d")
                if not base.endswith(f"_{date_tag}"):
                    raw_name = f"{base}_{date_tag}.{suf}"
            filename = os.path.join(target_dir, raw_name) if target_dir else raw_name

        if target_dir:
            os.makedirs(target_dir, exist_ok=True)
        elif os.path.dirname(filename):
            os.makedirs(os.path.dirname(filename), exist_ok=True)

        if os.path.exists(filename) and skip_if_identical:
            stats = os.stat(filename)
            size_matches = (datalength > 0 and datalength == stats.st_size) or (datalength == 0 and stats.st_size > 0)
            time_matches = True
            if parsed_dt is not None:
                time_matches = int(parsed_dt.timestamp()) == int(stats.st_mtime)
            if size_matches and time_matches:
                print(f"File {filename} already fully downloaded and identical to online version, skipping.")
                return True

        datadownloaded = 0
        shortfilename = os.path.basename(filename)
        incompletefilename = filename + ".incomplete"
        starttime = time.time()

        if os.path.exists(filename) and rename_old:
            print(f"Renaming {filename} to {filename}.old.")
            if os.path.exists(filename + ".old"):
                os.remove(filename + ".old")
            os.rename(filename, filename + ".old")

        print(f"Starting download of {shortfilename} (-> {filename})")
        with open(incompletefilename, "wb") as f:
            for chunk in downloaddata.iter_content(chunk_size=65536):
                if chunk:
                    f.write(chunk)
                    datadownloaded += len(chunk)
                    difftime = max(0.001, time.time() - starttime)
                    kbs = (datadownloaded / difftime) / 1024
                    if datalength > 0:
                        mysuffix = "{} / {} MB ({} KB/s)".format(
                            round(datadownloaded / 1024 / 1024, 1),
                            round(datalength / 1024 / 1024, 1),
                            round(kbs, 1),
                        )
                        printProgressBar(
                            datadownloaded,
                            datalength,
                            suffix=shortfilename,
                            prefix=mysuffix,
                            usepercent=False,
                        )
                    else:
                        print(
                            f"\r{round(datadownloaded / 1024 / 1024, 1)} MB ({round(kbs, 1)} KB/s) {shortfilename}",
                            end="",
                            flush=True,
                        )
        if datalength == 0:
            print(flush=True)

        os.rename(incompletefilename, filename)

        sizeondisk = os.path.getsize(filename)
        if datalength > 0 and sizeondisk != datalength:
            print("*** Size on Disk differs from HTTP!!")
            return False

        if parsed_dt is not None:
            timestamp = int(parsed_dt.timestamp())
            os.utime(filename, (timestamp, timestamp))

        return True
