import requests

def test_badge_generation_endpoint():
    base_url = "http://localhost:3009"
    endpoint = f"{base_url}/badge"
    timeout = 30

    # Basic parameters for badge generation
    params_svg = {
        "package": "react",
        "metric": "install-size",
        "format": "svg"
    }
    params_md = {
        "package": "react",
        "metric": "install-size",
        "format": "markdown"
    }
    params_style = {
        "package": "react",
        "metric": "install-size",
        "format": "svg",
        "style": "flat"
    }

    headers = {
        "Accept": "*/*"
    }

    try:
        # Request badge in SVG format
        resp_svg = requests.get(endpoint, params=params_svg, headers=headers, timeout=timeout)
        assert resp_svg.status_code == 200, f"SVG badge request failed with status {resp_svg.status_code}"
        content_type_svg = resp_svg.headers.get("Content-Type", "")
        assert "svg" in content_type_svg.lower() or resp_svg.text.strip().startswith("<svg"), \
            "SVG badge response does not contain valid SVG content"
        assert len(resp_svg.text.strip()) > 0, "SVG badge response content is empty"

        # Request badge in Markdown format
        resp_md = requests.get(endpoint, params=params_md, headers=headers, timeout=timeout)
        assert resp_md.status_code == 200, f"Markdown badge request failed with status {resp_md.status_code}"
        content_md = resp_md.text.strip()
        assert content_md.startswith("[") and "](" in content_md and content_md.endswith(")"), \
            "Markdown badge response does not appear to be a valid Markdown image link"
        assert len(content_md) > 10, "Markdown badge response content is too short"

        # Request badge with style parameter applied (SVG)
        resp_style = requests.get(endpoint, params=params_style, headers=headers, timeout=timeout)
        assert resp_style.status_code == 200, f"Styled SVG badge request failed with status {resp_style.status_code}"
        content_type_style = resp_style.headers.get("Content-Type", "")
        assert "svg" in content_type_style.lower() or resp_style.text.strip().startswith("<svg"), \
            "Styled SVG badge response does not contain valid SVG content"
        assert "flat" in resp_style.text.lower() or "style" in resp_style.text.lower(), \
            "Styled SVG badge does not reflect style parameter in the output"

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_badge_generation_endpoint()