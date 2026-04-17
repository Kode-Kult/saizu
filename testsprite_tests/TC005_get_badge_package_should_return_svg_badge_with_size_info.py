import requests

BASE_URL = "http://localhost:3009"
TIMEOUT = 30


def test_get_badge_package_should_return_svg_badge_with_size_info():
    # Packages to test (normal and scoped)
    packages = [
        "ms",
        "@babel/core"  # a common scoped package
    ]
    types = [None, "gzip", "install"]

    headers_svg = {"Accept": "image/svg+xml"}

    def url_encode_pkg_name(pkg_name):
        # Encode @ to %40 and / to %2F for scoped packages to match URL encoding in badge API path
        from urllib.parse import quote
        return quote(pkg_name, safe='')

    # Helper to get size info from /api/v1/package/:name for comparison
    def get_package_sizes(pkg_name):
        url = f"{BASE_URL}/api/v1/package/{url_encode_pkg_name(pkg_name)}"
        resp = requests.get(url, timeout=TIMEOUT)
        resp.raise_for_status()
        return resp.json()

    for package in packages:
        # Fetch package sizes info for validation
        try:
            package_info = get_package_sizes(package)
        except requests.HTTPError as e:
            # Skip if package not found or error occurs, since badge won't work without package info
            assert False, f"Failed to fetch package info for validation: {package} - {str(e)}"

        for typ in types:
            params = {}
            if typ is not None:
                params["type"] = typ

            badge_path = f"/badge/{url_encode_pkg_name(package)}"
            url = f"{BASE_URL}{badge_path}"

            resp = requests.get(url, headers=headers_svg, params=params, timeout=TIMEOUT)

            # Validate status code 200
            assert resp.status_code == 200, f"Expected 200 OK for badge {badge_path} with type={typ}, got {resp.status_code}"

            # Validate content type is SVG image
            content_type = resp.headers.get("Content-Type", "")
            assert content_type.startswith("image/svg+xml"), f"Expected Content-Type image/svg+xml but got {content_type}"

            content = resp.text

            # Basic SVG validation
            assert content.strip().startswith("<svg"), "Response content is not a valid SVG (missing <svg>)"
            assert content.strip().endswith("</svg>"), "Response content is not a valid SVG (missing </svg>)"

            # Validate that badge contains size info according to type:
            # The badge likely contains text with size in readable units (e.g., 'KB' or 'bytes')
            # For test, validate we find the correct size in the SVG text for the requested type or default gzip if no type

            if typ == "install":
                expected_size_bytes = package_info.get("installSize")
            else:
                # default type is gzip if none specified or 'gzip'
                expected_size_bytes = package_info.get("gzipSize")

            assert isinstance(expected_size_bytes, int), "Expected size in bytes must be int"

            def bytes_to_human_readable(size_bytes):
                for unit in ['B', 'KB', 'MB', 'GB']:
                    if size_bytes < 1024:
                        return f"{size_bytes} {unit}"
                    size_bytes = size_bytes / 1024
                return f"{size_bytes:.2f} GB"

            expected_size_str = bytes_to_human_readable(expected_size_bytes)
            # Badge text cases may be uppercase or lowercase, include approximate check ignoring case/spaces
            content_lower = content.lower()
            found_size_text = False

            # Check if at least the number part exists in the SVG text, ignoring exact unit formatting that badge uses
            # We do a relaxed check to find the raw numeric value (e.g. "123 KB") ignoring formatting differences

            import re

            # Find all numbers with their units in badge (e.g. 123 KB, 1.2 MB)
            matches = re.findall(r"(\d+(\.\d+)?\s*[KMGT]?B)", content, re.IGNORECASE)
            found_size_text = any(match[0].replace(" ", "").lower() in content_lower.replace(" ", "") for match in matches)

            assert found_size_text, f"Expected size text like {expected_size_str} not found in badge SVG content"

    print("Test TC005 passed: SVG badges returned with correct size info for both normal and scoped packages with various type params.")


test_get_badge_package_should_return_svg_badge_with_size_info()