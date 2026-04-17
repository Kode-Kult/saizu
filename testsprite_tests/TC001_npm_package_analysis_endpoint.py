import requests

def test_tc001_npm_package_analysis_endpoint():
    base_url = "http://localhost:3009"
    package_name = "react"
    version = "17.0.2"
    url = f"{base_url}/api/v1/package/{package_name}?version={version}"
    headers = {
        "Accept": "application/json"
    }
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()

        # Validate top-level keys expected in the response describing the package analysis
        expected_keys = [
            "installSize",        # in bytes install size expected
            "gzipSize",           # gzip compressed size
            "fileTypeDistribution",   # distribution of files by type
            "dependencyTree",     # tree of dependencies
            "moduleFormat",       # e.g. esm, cjs, umd
            "types",              # types availability e.g. "included", "none"
            "license"             # license string
        ]
        for key in expected_keys:
            assert key in data, f"Response missing '{key}' key"

        # Validate that installSize and gzipSize are positive numbers
        assert isinstance(data["installSize"], (int, float)) and data["installSize"] > 0
        assert isinstance(data["gzipSize"], (int, float)) and data["gzipSize"] > 0

        # fileTypeDistribution should be a dictionary with at least one entry
        assert isinstance(data["fileTypeDistribution"], dict) and len(data["fileTypeDistribution"]) > 0

        # dependencyTree should be a dictionary or list representing the tree structure
        assert isinstance(data["dependencyTree"], (dict, list))

        # moduleFormat should be a non-empty string
        assert isinstance(data["moduleFormat"], str) and data["moduleFormat"].strip() != ""

        # types should be a string, typically "included", "none", or similar
        assert isinstance(data["types"], str) and data["types"].strip() != ""

        # license should be a non-empty string
        assert isinstance(data["license"], str) and data["license"].strip() != ""

    except requests.exceptions.RequestException as e:
        assert False, f"HTTP request failed: {e}"
    except ValueError:
        assert False, "Response is not valid JSON"

test_tc001_npm_package_analysis_endpoint()
