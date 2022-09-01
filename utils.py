import glob
import os
import urllib.parse

WIDTHS = [8120, 5260, 3840, 2560, 1920, 1280, 1024, 768, 640, 320]
DEV = os.getenv("NODE_ENV") == "development"
DEPLOY_URL = os.getenv("DEPLOY_URL")


def imgurl(image, width, ext="png", convert_to=""):
    if DEV:
        return f"/static/img/{urllib.parse.quote(image)}.{ext}"

    conversion = f"@{convert_to}" if convert_to else ""
    return f"https://img.panaitiu.com/_/{width}/plain/{DEPLOY_URL}/static/img/{urllib.parse.quote(image)}.{ext}{conversion}"


def srcset(image, ext="png", maxwidth=8120, factor=1, convert_to=""):
    if DEV:
        return f"/static/img/{urllib.parse.quote(image)}.{ext}"

    return ",".join(
        f"{imgurl(image, width, ext, convert_to)} {int(round(float(width) / float(factor)))}w"
        for width in WIDTHS
        if width <= float(maxwidth)
    )


def images(folder, ext="png"):
    return [
        os.path.splitext(img[18:])[0]
        for img in glob.glob(f"public/static/img/{folder}/*.{ext}")
    ]
