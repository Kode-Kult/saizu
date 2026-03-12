import requests

BASE_URL = "http://localhost:3009"
TIMEOUT = 30

def test_get_api_v1_package_name_analyzes_npm_package():
    package_names = [
        "lodash",
        "@tanstack/react-query"
    ]

    for package_name in package_names:
        url = f"{BASE_URL}/api/v1/package/{package_name}"
        try:
            headers = {
                "Accept": "application/json"
            }
            response = requests.get(url, headers=headers, timeout=TIMEOUT)
            assert response.status_code == 200, f"Expected 200, got {response.status_code} for package '{package_name}'"
            data = response.json()
            # Validate required fields in the response
            expected_fields = [
                "source",
                "packageName",
                "packageVersion",
                "description",
                "license",
                "gzipSize",
                "installSize",
                "fileCount",
                "typeBreakdown",
                "dependencies",
                "hasESM",
                "hasCJS",
                "hasTypes",
                "downloadTime",
                "cachedAt"
            ]
            for field in expected_fields:
                assert field in data, f"Response JSON missing field '{field}' for package '{package_name}'"
            assert data["source"] == "npm", f"Expected source 'npm', got '{data['source']}' for package '{package_name}'"
            assert data["packageName"].lower() == package_name.lower(), f"Expected packageName '{package_name}', got '{data['packageName']}'"
        except requests.RequestException as e:
            assert False, f"RequestException while testing package '{package_name}': {e}"
        except ValueError as e:
            assert False, f"JSON decode error for package '{package_name}': {e}"

test_get_api_v1_package_name_analyzes_npm_package()
