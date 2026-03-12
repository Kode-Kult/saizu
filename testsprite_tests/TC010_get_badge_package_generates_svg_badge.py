import requests

BASE_URL = "http://localhost:3009"
TIMEOUT = 30

def test_get_badge_package_generates_svg_badge():
    # Valid non-scoped package
    url_non_scoped = f"{BASE_URL}/badge/lodash"
    # Valid scoped package
    url_scoped = f"{BASE_URL}/badge/@tanstack/react-query"
    # Valid owner/repo
    url_owner_repo = f"{BASE_URL}/badge/kode-kult/saizu"
    
    headers = {
        "Accept": "image/svg+xml"
    }

    # Test non-scoped package badge
    resp_non_scoped = requests.get(url_non_scoped, headers=headers, timeout=TIMEOUT)
    assert resp_non_scoped.status_code == 200, f"Expected 200 but got {resp_non_scoped.status_code} for non-scoped package badge"
    content_type_non_scoped = resp_non_scoped.headers.get("Content-Type", "")
    assert "image/svg+xml" in content_type_non_scoped, f"Expected Content-Type to include 'image/svg+xml' but got '{content_type_non_scoped}'"

    # Test scoped package badge
    resp_scoped = requests.get(url_scoped, headers=headers, timeout=TIMEOUT)
    assert resp_scoped.status_code == 200, f"Expected 200 but got {resp_scoped.status_code} for scoped package badge"
    content_type_scoped = resp_scoped.headers.get("Content-Type", "")
    assert "image/svg+xml" in content_type_scoped, f"Expected Content-Type to include 'image/svg+xml' but got '{content_type_scoped}'"

    # Test owner/repo badge
    resp_owner_repo = requests.get(url_owner_repo, headers=headers, timeout=TIMEOUT)
    assert resp_owner_repo.status_code == 200, f"Expected 200 but got {resp_owner_repo.status_code} for owner/repo badge"
    content_type_owner_repo = resp_owner_repo.headers.get("Content-Type", "")
    assert "image/svg+xml" in content_type_owner_repo, f"Expected Content-Type to include 'image/svg+xml' but got '{content_type_owner_repo}'"

test_get_badge_package_generates_svg_badge()